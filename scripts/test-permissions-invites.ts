import "dotenv/config";
import { randomUUID } from "node:crypto";
import {
  acceptOrganizationInvitation,
  createOrganizationInvitation,
  getInvitationPreview,
  revokeOrganizationInvitation,
} from "../src/data/invitations";
import { clearOrganizationData } from "../src/data/organization-data";
import { prisma } from "../src/lib/prisma";
import { getPermissionMatrix, hasPermission } from "../src/lib/permissions";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function expectError(callback: () => Promise<unknown>, expected: string) {
  try {
    await callback();
    throw new Error(`Expected ${expected}.`);
  } catch (error) {
    assert(error instanceof Error && error.message === expected, `Expected ${expected}, received ${error instanceof Error ? error.message : "unknown error"}.`);
  }
}

async function testPermissionsAndInvites() {
  const organizationAId = randomUUID();
  const organizationBId = randomUUID();
  const ownerId = randomUUID();

  try {
    await prisma.organization.createMany({ data: [{ id: organizationAId, name: "Permissões A" }, { id: organizationBId, name: "Permissões B" }] });
    await prisma.user.create({ data: { id: ownerId, name: "Owner de teste", email: `${ownerId}@permissions.test`, organizationId: organizationAId, role: "OWNER" } });
    assert(hasPermission("OWNER", "MANAGE_USERS"), "Owner permission matrix is incomplete.");
    assert(!hasPermission("MEMBER", "MANAGE_USERS"), "Member can manage users.");
    assert(getPermissionMatrix().some((permission) => permission.permission === "MANAGE_USERS" && permission.OWNER && !permission.MEMBER), "Permission matrix was not published.");

    const accepted = await createOrganizationInvitation({ organizationId: organizationAId, invitedById: ownerId, email: "accepted@permissions.test" });
    const acceptedUser = await acceptOrganizationInvitation({ token: accepted.token, name: "Usuário aceito", password: "password123" });
    assert(acceptedUser.email === "accepted@permissions.test", "Invitation was not accepted.");

    const expired = await createOrganizationInvitation({ organizationId: organizationAId, invitedById: ownerId, email: "expired@permissions.test" });
    await prisma.organizationInvite.update({ where: { id: expired.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert((await getInvitationPreview(expired.token))?.isValid === false, "Expired invitation remained valid.");
    await expectError(() => acceptOrganizationInvitation({ token: expired.token, name: "Usuário expirado", password: "password123" }), "INVITE_EXPIRED");

    const revoked = await createOrganizationInvitation({ organizationId: organizationAId, invitedById: ownerId, email: "revoked@permissions.test" });
    await revokeOrganizationInvitation(organizationAId, ownerId, revoked.id);
    assert((await getInvitationPreview(revoked.token))?.isValid === false, "Revoked invitation remained valid.");
    await expectError(() => acceptOrganizationInvitation({ token: revoked.token, name: "Usuário revogado", password: "password123" }), "INVITE_REVOKED");

    const auditCount = await prisma.auditLog.count({ where: { organizationId: organizationAId } });
    assert(auditCount >= 3, "Relevant access changes were not audited.");
    assert((await prisma.organizationInvite.count({ where: { organizationId: organizationBId } })) === 0, "Invitation isolation failed.");
  } finally {
    await clearOrganizationData(organizationAId);
    await clearOrganizationData(organizationBId);
    await prisma.user.deleteMany({ where: { organizationId: { in: [organizationAId, organizationBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [organizationAId, organizationBId] } } });
  }

  console.log("Permission matrix, invitation lifecycle, audit, and isolation passed.");
}

testPermissionsAndInvites()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
