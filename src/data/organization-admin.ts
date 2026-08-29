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

export async function getOrganizationAdminDetails(organizationId: string) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { users: true, products: true, imports: true } },
      users: {
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
  });

  if (!organization) return null;

  return {
    id: organization.id,
    name: organization.name,
    createdAt: organization.createdAt.toLocaleDateString("pt-BR"),
    usersCount: organization._count.users,
    productsCount: organization._count.products,
    importsCount: organization._count.imports,
    users: organization.users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toLocaleDateString("pt-BR"),
    })),
  };
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

export async function deleteOrganization({
  organizationId,
  confirmation,
}: {
  organizationId: string;
  confirmation: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const organization = await transaction.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });

    if (!organization) throw new Error("ORGANIZATION_NOT_FOUND");
    if (confirmation !== organization.name) throw new Error("CONFIRMATION_MISMATCH");

    const users = await transaction.user.findMany({
      where: { organizationId: organization.id },
      select: { id: true },
    });
    const userIds = users.map(({ id }) => id);
    const stockHistory = await transaction.stockHistory.deleteMany({
      where: { organizationId: organization.id },
    });
    const imports = await transaction.importRecord.deleteMany({
      where: { organizationId: organization.id },
    });
    const products = await transaction.product.deleteMany({
      where: { organizationId: organization.id },
    });
    await transaction.session.deleteMany({ where: { userId: { in: userIds } } });
    await transaction.account.deleteMany({ where: { userId: { in: userIds } } });
    await transaction.user.deleteMany({ where: { id: { in: userIds } } });
    await transaction.organization.delete({ where: { id: organization.id } });

    return {
      organizationName: organization.name,
      products: products.count,
      imports: imports.count,
      stockHistory: stockHistory.count,
      users: users.length,
    };
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
