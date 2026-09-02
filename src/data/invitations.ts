import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const transactionOptions = { maxWait: 10_000, timeout: 30_000 };

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function listOrganizationInvitations(organizationId: string) {
  return prisma.organizationInvite.findMany({
    where: { organizationId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
    select: {
      id: true,
      email: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });
}

export async function createOrganizationInvitation(input: {
  organizationId: string;
  invitedById: string;
  email: string;
}) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS);

  const invitation = await prisma.$transaction(async (transaction) => {
    const existingUser = await transaction.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existingUser) throw new Error("EMAIL_ALREADY_EXISTS");
    const pending = await transaction.organizationInvite.findFirst({
      where: {
        organizationId: input.organizationId,
        email: input.email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (pending) throw new Error("INVITE_ALREADY_EXISTS");

    const created = await transaction.organizationInvite.create({
      data: {
        organizationId: input.organizationId,
        invitedById: input.invitedById,
        email: input.email,
        tokenHash: hashToken(token),
        expiresAt,
      },
      select: { id: true, email: true, expiresAt: true },
    });
    await transaction.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.invitedById,
        action: "INVITE_CREATED",
        entityType: "ORGANIZATION_INVITE",
        entityId: created.id,
        metadata: { email: input.email, expiresAt: expiresAt.toISOString() },
      },
    });
    return created;
  }, transactionOptions);

  return { ...invitation, token };
}

export async function revokeOrganizationInvitation(organizationId: string, actorId: string, invitationId: string) {
  return prisma.$transaction(async (transaction) => {
    const invitation = await transaction.organizationInvite.findFirst({
      where: { id: invitationId, organizationId, acceptedAt: null, revokedAt: null },
      select: { id: true, email: true },
    });
    if (!invitation) throw new Error("INVITE_NOT_FOUND");

    await transaction.organizationInvite.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date() },
    });
    await transaction.auditLog.create({
      data: {
        organizationId,
        actorId,
        action: "INVITE_REVOKED",
        entityType: "ORGANIZATION_INVITE",
        entityId: invitation.id,
        metadata: { email: invitation.email },
      },
    });
    return invitation;
  }, transactionOptions);
}

export async function getInvitationPreview(token: string) {
  const invitation = await prisma.organizationInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { email: true, expiresAt: true, acceptedAt: true, revokedAt: true },
  });
  if (!invitation) return null;
  return {
    email: invitation.email,
    expiresAt: invitation.expiresAt,
    isValid: !invitation.acceptedAt && !invitation.revokedAt && invitation.expiresAt > new Date(),
  };
}

export async function acceptOrganizationInvitation(input: {
  token: string;
  name: string;
  password: string;
}) {
  const password = await hashPassword(input.password);
  return prisma.$transaction(async (transaction) => {
    const invitation = await transaction.organizationInvite.findUnique({
      where: { tokenHash: hashToken(input.token) },
      select: { id: true, email: true, organizationId: true, expiresAt: true, acceptedAt: true, revokedAt: true },
    });
    if (!invitation) throw new Error("INVITE_NOT_FOUND");
    if (invitation.acceptedAt) throw new Error("INVITE_ACCEPTED");
    if (invitation.revokedAt) throw new Error("INVITE_REVOKED");
    if (invitation.expiresAt <= new Date()) throw new Error("INVITE_EXPIRED");

    const existingUser = await transaction.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
    if (existingUser) throw new Error("EMAIL_ALREADY_EXISTS");
    const user = await transaction.user.create({
      data: { name: input.name, email: invitation.email, organizationId: invitation.organizationId, role: "MEMBER" },
      select: { id: true, name: true, email: true },
    });
    await transaction.account.create({
      data: { issuer: "local:credential", accountId: user.id, providerId: "credential", userId: user.id, password },
    });
    await transaction.organizationInvite.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
    await transaction.auditLog.create({
      data: {
        organizationId: invitation.organizationId,
        actorId: user.id,
        action: "INVITE_ACCEPTED",
        entityType: "ORGANIZATION_INVITE",
        entityId: invitation.id,
        metadata: { email: invitation.email, userId: user.id },
      },
    });
    return user;
  }, transactionOptions);
}
