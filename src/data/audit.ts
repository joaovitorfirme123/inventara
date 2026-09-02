import { prisma } from "@/lib/prisma";

export function listOrganizationAuditLogs(organizationId: string) {
  return prisma.auditLog.findMany({
    where: { organizationId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      action: true,
      entityType: true,
      createdAt: true,
      actor: { select: { name: true, email: true } },
    },
  });
}
