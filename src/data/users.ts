import { prisma } from "@/lib/prisma";

export function listUsersByOrganization(organizationId: string) {
  return prisma.user.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });
}
