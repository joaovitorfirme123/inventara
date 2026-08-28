import { prisma } from "@/lib/prisma";

export function listUsersByOrganization(organizationId: string) {
  return prisma.user.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
}
