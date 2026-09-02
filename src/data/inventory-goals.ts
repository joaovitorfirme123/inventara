import { prisma } from "@/lib/prisma";

export function listInventoryGoals(organizationId: string, year: number) {
  return prisma.inventoryGoal.findMany({
    where: { organizationId, year },
    orderBy: { section: "asc" },
    select: {
      id: true,
      section: true,
      year: true,
      targetPercentage: true,
    },
  });
}

export function saveInventoryGoal(input: {
  organizationId: string;
  year: number;
  section: string;
  targetPercentage: number;
}) {
  return prisma.inventoryGoal.upsert({
    where: {
      organizationId_year_section: {
        organizationId: input.organizationId,
        year: input.year,
        section: input.section,
      },
    },
    update: { targetPercentage: input.targetPercentage },
    create: input,
    select: { id: true, section: true, year: true, targetPercentage: true },
  });
}
