import { getInventoryCoverageHistory } from "@/data/inventory-coverage";

export type CoverageComparison = {
  current: { year: number; coveragePercentage: number | null };
  previous: { year: number; coveragePercentage: number | null };
  variation: number | null;
  monthly: Array<{
    month: number;
    label: string;
    currentCoverage: number | null;
    previousCoverage: number | null;
  }>;
};

function latestCoverage(history: Awaited<ReturnType<typeof getInventoryCoverageHistory>>) {
  return history.at(-1)?.coveragePercentage ?? null;
}

export async function getCoverageComparison(
  organizationId: string,
  currentYear: number,
  previousYear: number,
) {
  const [currentHistory, previousHistory] = await Promise.all([
    getInventoryCoverageHistory(organizationId, currentYear),
    getInventoryCoverageHistory(organizationId, previousYear),
  ]);
  const currentCoverage = latestCoverage(currentHistory);
  const previousCoverage = latestCoverage(previousHistory);
  const currentByMonth = new Map(currentHistory.map((point) => [point.month, point]));
  const previousByMonth = new Map(previousHistory.map((point) => [point.month, point]));
  const months = [...new Set([...currentByMonth.keys(), ...previousByMonth.keys()])].sort((left, right) => left - right);

  return {
    current: { year: currentYear, coveragePercentage: currentCoverage },
    previous: { year: previousYear, coveragePercentage: previousCoverage },
    variation: currentCoverage !== null && previousCoverage !== null
      ? currentCoverage - previousCoverage
      : null,
    monthly: months.map((month) => ({
      month,
      label: currentByMonth.get(month)?.label ?? previousByMonth.get(month)?.label ?? String(month),
      currentCoverage: currentByMonth.get(month)?.coveragePercentage ?? null,
      previousCoverage: previousByMonth.get(month)?.coveragePercentage ?? null,
    })),
  } satisfies CoverageComparison;
}
