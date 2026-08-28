export const PRIORITIES = [
  "Urgente",
  "Alta",
  "Média",
  "Baixa",
  "Atualizado",
] as const;

export type InventoryPriority = (typeof PRIORITIES)[number];

export type PriorityInput = {
  totalSkus: number;
  pendingSkus: number;
  noDateSkus: number;
  oldestPendingDate: Date | null;
};

const WEIGHTS = {
  pendingVolume: 35,
  pendingPercentage: 25,
  age: 20,
  noDate: 10,
  subgroupVolume: 10,
} as const;

function logarithmicScore(value: number, reference: number) {
  return Math.min(1, Math.log1p(value) / Math.log1p(reference));
}

export function calculatePriorityScore(
  input: PriorityInput,
  now = new Date(),
) {
  if (input.pendingSkus === 0 || input.totalSkus === 0) {
    return 0;
  }

  const pendingRatio = input.pendingSkus / input.totalSkus;
  const noDateRatio = input.noDateSkus / input.totalSkus;
  const ageInDays = input.oldestPendingDate
    ? Math.max(
        0,
        (now.getTime() - input.oldestPendingDate.getTime()) / 86_400_000,
      )
    : 0;

  const score =
    logarithmicScore(input.pendingSkus, 200) * WEIGHTS.pendingVolume +
    pendingRatio * WEIGHTS.pendingPercentage +
    Math.min(1, ageInDays / 1095) * WEIGHTS.age +
    noDateRatio * WEIGHTS.noDate +
    logarithmicScore(input.totalSkus, 500) * WEIGHTS.subgroupVolume;

  return Math.round(score * 10) / 10;
}

export function getPriority(score: number, pendingSkus: number): InventoryPriority {
  if (pendingSkus === 0) return "Atualizado";
  if (score >= 70) return "Urgente";
  if (score >= 50) return "Alta";
  if (score >= 30) return "Média";
  return "Baixa";
}
