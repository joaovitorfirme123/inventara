import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";

const transactionOptions = { maxWait: 10_000, timeout: 30_000 };

export type CreateOrganizationInput = {
  organizationName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
};

export type CreateUserInput = {
  organizationId: string;
  name: string;
  email: string;
  password: string;
};

export async function listOrganizations() {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { users: true, products: true } },
    },
  });

  return organizations.map((organization) => ({
    id: organization.id,
    name: organization.name,
    createdAt: organization.createdAt.toISOString(),
    users: organization._count.users,
    products: organization._count.products,
  }));
}

export async function createOrganizationWithOwner(input: CreateOrganizationInput) {
  const password = await hashPassword(input.ownerPassword);

  return prisma.$transaction(async (transaction) => {
    const existingUser = await transaction.user.findUnique({
      where: { email: input.ownerEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const organization = await transaction.organization.create({
      data: { name: input.organizationName },
    });
    const owner = await transaction.user.create({
      data: {
        name: input.ownerName,
        email: input.ownerEmail,
        organizationId: organization.id,
        role: "OWNER",
        isActive: true,
      },
    });

    await transaction.account.create({
      data: {
        issuer: "local:credential",
        accountId: owner.id,
        providerId: "credential",
        userId: owner.id,
        password,
      },
    });

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      ownerId: owner.id,
    };
  }, transactionOptions);
}

export async function createOrganizationUser(input: CreateUserInput) {
  const password = await hashPassword(input.password);

  return prisma.$transaction(async (transaction) => {
    const existingUser = await transaction.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existingUser) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const user = await transaction.user.create({
      data: {
        name: input.name,
        email: input.email,
        organizationId: input.organizationId,
        role: "MEMBER",
        isActive: true,
      },
    });

    await transaction.account.create({
      data: {
        issuer: "local:credential",
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password,
      },
    });

    return { id: user.id, name: user.name, email: user.email };
  }, transactionOptions);
}

export async function deactivateOrganizationUser({
  organizationId,
  userId,
  actorId,
}: {
  organizationId: string;
  userId: string;
  actorId: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findFirst({
      where: { id: userId, organizationId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }
    if (user.id === actorId) {
      throw new Error("CANNOT_DEACTIVATE_SELF");
    }
    if (user.role !== "MEMBER") {
      throw new Error("OWNER_CANNOT_BE_DEACTIVATED");
    }

    await transaction.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });
    await transaction.session.deleteMany({ where: { userId: user.id } });

    return { id: user.id, wasActive: user.isActive };
  }, transactionOptions);
}
