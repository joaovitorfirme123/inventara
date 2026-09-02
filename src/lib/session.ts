import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/permissions";

export type SessionContext = {
  sessionId: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    organizationId: string | null;
    organizationName: string | null;
  };
};

export type OrganizationSessionContext = SessionContext & {
  user: SessionContext["user"] & {
    organizationId: string;
    organizationName: string;
  };
};

export async function getSessionContext(requestHeaders: Headers): Promise<SessionContext | null> {
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
  });

  if (!user || !user.isActive) return null;

  return {
    sessionId: session.session.id,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: user.organization?.name ?? null,
    },
  };
}

export const getOptionalSessionContext = cache(async () =>
  getSessionContext(await headers()),
);

export const requireSessionContext = cache(async (): Promise<SessionContext> => {
  const session = await getOptionalSessionContext();

  if (!session) redirect("/login");

  return session;
});

export const requireOrganizationSessionContext = cache(async (): Promise<OrganizationSessionContext> => {
  const session = await requireSessionContext();

  if (!session.user.organizationId || !session.user.organizationName) {
    redirect("/admin/organizacoes");
  }

  return session as OrganizationSessionContext;
});

export const requireOrganizationOwnerContext = cache(async (): Promise<OrganizationSessionContext> => {
  const session = await requireOrganizationSessionContext();

  if (session.user.role !== "OWNER") {
    redirect("/");
  }

  return session;
});

export const requireOrganizationPermission = cache(async (permission: Permission): Promise<OrganizationSessionContext> => {
  const session = await requireOrganizationSessionContext();
  if (!hasPermission(session.user.role, permission)) redirect("/");
  return session;
});

export const requirePlatformAdminContext = cache(async (): Promise<SessionContext> => {
  const session = await requireSessionContext();

  if (session.user.role !== "PLATFORM_ADMIN") {
    redirect("/");
  }

  return session;
});
