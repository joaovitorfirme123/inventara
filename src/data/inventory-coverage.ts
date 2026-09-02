import { prisma } from "@/lib/prisma";

export type CoverageHistoryPoint = {
  month: number;
  label: string;
  coveragePercentage: number;
  goalPercentage: number | null;
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  timeZone: "UTC",
});

export async function getInventoryCoverageHistory(
  organizationId: string,
  year: number,
) {
  const [coverage, goals] = await Promise.all([
    prisma.inventoryCoverage.findMany({
      where: { organizationId, year },
      orderBy: [{ month: "asc" }, { section: "asc" }],
      select: {
        month: true,
        section: true,
        totalSkus: true,
        countedSkus: true,
      },
    }),
    prisma.inventoryGoal.findMany({
      where: { organizationId, year },
      select: { section: true, targetPercentage: true },
    }),
  ]);
  const goalsBySection = new Map(goals.map((goal) => [goal.section, goal.targetPercentage]));
  const months = new Map<number, {
    totalSkus: number;
    countedSkus: number;
    goalWeightedTotal: number;
    goalSkus: number;
  }>();

  for (const row of coverage) {
    const accumulator = months.get(row.month) ?? {
      totalSkus: 0,
      countedSkus: 0,
      goalWeightedTotal: 0,
      goalSkus: 0,
    };
    accumulator.totalSkus += row.totalSkus;
    accumulator.countedSkus += row.countedSkus;
    if (goalsBySection.has(row.section)) {
      accumulator.goalWeightedTotal += (goalsBySection.get(row.section) ?? 0) * row.totalSkus;
      accumulator.goalSkus += row.totalSkus;
    }
    months.set(row.month, accumulator);
  }

  return Array.from(months.entries()).map(([month, accumulator]) => ({
    month,
    label: monthFormatter.format(new Date(Date.UTC(year, month - 1, 1))),
    coveragePercentage: accumulator.totalSkus === 0
      ? 0
      : (accumulator.countedSkus / accumulator.totalSkus) * 100,
    goalPercentage: accumulator.goalSkus === 0
      ? null
      : accumulator.goalWeightedTotal / accumulator.goalSkus,
  }));
}
