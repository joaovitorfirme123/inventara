import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getSessionContext(requestHeaders: Headers) {
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
  });

  if (!user) return null;

  return {
    sessionId: session.session.id,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
    },
  };
}

export const getOptionalSessionContext = cache(async () =>
  getSessionContext(await headers()),
);

export const requireSessionContext = cache(async () => {
  const session = await getOptionalSessionContext();

  if (!session) redirect("/login");

  return session;
});
