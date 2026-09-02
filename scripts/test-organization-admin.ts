import "dotenv/config";

import {
  createOrganizationUser,
  createOrganizationWithOwner,
  deactivateOrganizationUser,
  deleteOrganization,
  getOrganizationAdminDetails,
} from "../src/data/organization-admin";
import { listUsersByOrganization } from "../src/data/users";
import { prisma } from "../src/lib/prisma";

const organizationNames = ["Admin Test A", "Admin Test B", "Admin Rollback"];
const emails = [
  "admin-owner-a@test.invalid",
  "admin-member-a@test.invalid",
  "admin-owner-b@test.invalid",
];

async function cleanup() {
  const organizations = await prisma.organization.findMany({
    where: { name: { in: organizationNames } },
    select: { id: true },
  });
  const organizationIds = organizations.map(({ id }) => id);
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  const userIds = users.map(({ id }) => id);

  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.organizationInvite.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.auditLog.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.inventoryPlan.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.stockHistory.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.importRecord.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.product.deleteMany({ where: { organizationId: { in: organizationIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } });
}

async function testOrganizationAdmin() {
  await cleanup();

  try {
    const organizationA = await createOrganizationWithOwner({
      organizationName: "Admin Test A",
      ownerName: "Owner A",
      ownerEmail: emails[0],
      ownerPassword: "owner-a-password",
    });
    const member = await createOrganizationUser({
      organizationId: organizationA.organizationId,
      name: "Member A",
      email: emails[1],
      password: "member-a-password",
    });
    const organizationB = await createOrganizationWithOwner({
      organizationName: "Admin Test B",
      ownerName: "Owner B",
      ownerEmail: emails[2],
      ownerPassword: "owner-b-password",
    });

    const usersA = await listUsersByOrganization(organizationA.organizationId);
    const usersB = await listUsersByOrganization(organizationB.organizationId);
    if (usersA.length !== 2 || usersA.every((user) => user.email !== emails[1])) {
      throw new Error("Organization A users were not provisioned correctly.");
    }
    if (usersB.length !== 1 || usersB[0].email !== emails[2]) {
      throw new Error("Organization B received users from another tenant.");
    }
    if (usersA.some((user) => user.role === "OWNER" && user.email !== emails[0])) {
      throw new Error("Organization A owner role is inconsistent.");
    }

    await deactivateOrganizationUser({
      organizationId: organizationA.organizationId,
      userId: member.id,
      actorId: organizationA.ownerId,
    });
    const deactivated = await prisma.user.findUnique({
      where: { id: member.id },
      select: { isActive: true },
    });
    if (deactivated?.isActive !== false) {
      throw new Error("Member was not deactivated.");
    }

    const details = await getOrganizationAdminDetails(organizationA.organizationId);
    if (!details || details.users.length !== 2 || details.users[0].role !== "OWNER") {
      throw new Error("Organization details did not expose users and roles correctly.");
    }

    try {
      await deleteOrganization({ organizationId: organizationB.organizationId, confirmation: "wrong name" });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "CONFIRMATION_MISMATCH") throw error;
    }
    if (!(await prisma.organization.findUnique({ where: { id: organizationB.organizationId } }))) {
      throw new Error("Organization was deleted with an invalid confirmation.");
    }
    await deleteOrganization({ organizationId: organizationB.organizationId, confirmation: "Admin Test B" });
    if (await prisma.organization.findUnique({ where: { id: organizationB.organizationId } })) {
      throw new Error("Organization was not deleted.");
    }
    if (await prisma.user.findUnique({ where: { email: emails[2] } })) {
      throw new Error("Organization users were not deleted with the organization.");
    }

    try {
      await createOrganizationWithOwner({
        organizationName: "Admin Rollback",
        ownerName: "Duplicate",
        ownerEmail: emails[0],
        ownerPassword: "duplicate-password",
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "EMAIL_ALREADY_EXISTS") throw error;
    }
    const rollbackOrganization = await prisma.organization.findFirst({
      where: { name: "Admin Rollback" },
    });
    if (rollbackOrganization) throw new Error("Failed organization creation left data behind.");

    const platformAdminEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
    if (platformAdminEmail) {
      const platformAdmin = await prisma.user.findUnique({
        where: { email: platformAdminEmail },
        select: { role: true, organizationId: true, isActive: true },
      });
      if (!platformAdmin || platformAdmin.role !== "PLATFORM_ADMIN" || platformAdmin.organizationId || !platformAdmin.isActive) {
        throw new Error("Platform admin bootstrap is invalid.");
      }
    }
  } finally {
    await cleanup();
  }

  console.log("Organization creation, user management, isolation, and rollback passed.");
}

testOrganizationAdmin()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
