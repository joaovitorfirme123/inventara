import "dotenv/config";

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../src/lib/prisma";

async function bootstrapPlatformAdmin() {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.PLATFORM_ADMIN_NAME?.trim();
  const rawPassword = process.env.PLATFORM_ADMIN_PASSWORD;

  if (!email || !name || !rawPassword || rawPassword.length < 8) {
    throw new Error(
      "PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_NAME, and PLATFORM_ADMIN_PASSWORD (8+ chars) are required.",
    );
  }

  const password = await hashPassword(rawPassword);
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser && (existingUser.role !== "PLATFORM_ADMIN" || existingUser.organizationId)) {
    throw new Error("The email already belongs to a tenant user.");
  }

  const user = await prisma.$transaction(async (transaction) => {
    const admin = existingUser
      ? await transaction.user.update({
          where: { id: existingUser.id },
          data: { name, role: "PLATFORM_ADMIN", isActive: true, organizationId: null },
        })
      : await transaction.user.create({
          data: {
            id: randomUUID(),
            name,
            email,
            role: "PLATFORM_ADMIN",
            isActive: true,
          },
        });

    await transaction.account.upsert({
      where: {
        issuer_accountId: {
          issuer: "local:credential",
          accountId: admin.id,
        },
      },
      update: { password },
      create: {
        issuer: "local:credential",
        accountId: admin.id,
        providerId: "credential",
        userId: admin.id,
        password,
      },
    });

    return admin;
  });

  console.log(`Platform admin ready: ${user.email}`);
}

bootstrapPlatformAdmin()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
