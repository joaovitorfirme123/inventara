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

export type PriorityRuleConfig = {
  weights: {
    pendingVolume: number;
    pendingPercentage: number;
    age: number;
    noDate: number;
    subgroupVolume: number;
  };
  references: {
    pendingVolume: number;
    ageDays: number;
    subgroupVolume: number;
  };
  thresholds: {
    urgent: number;
    high: number;
    medium: number;
  };
};

export const DEFAULT_PRIORITY_RULE: PriorityRuleConfig = {
  weights: {
    pendingVolume: 35,
    pendingPercentage: 25,
    age: 20,
    noDate: 10,
    subgroupVolume: 10,
  },
  references: {
    pendingVolume: 200,
    ageDays: 1095,
    subgroupVolume: 500,
  },
  thresholds: {
    urgent: 70,
    high: 50,
    medium: 30,
  },
};

const weightKeys = [
  "pendingVolume",
  "pendingPercentage",
  "age",
  "noDate",
  "subgroupVolume",
] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parsePriorityRuleConfig(value: unknown): PriorityRuleConfig | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const weights = candidate.weights;
  const references = candidate.references;
  const thresholds = candidate.thresholds;
  if (!weights || typeof weights !== "object" || !references || typeof references !== "object" || !thresholds || typeof thresholds !== "object") return null;

  const typedWeights = weights as Record<string, unknown>;
  const typedReferences = references as Record<string, unknown>;
  const typedThresholds = thresholds as Record<string, unknown>;
  const parsedWeights = Object.fromEntries(weightKeys.map((key) => [key, typedWeights[key]])) as PriorityRuleConfig["weights"];
  const weightTotal = weightKeys.reduce((total, key) => total + (isFiniteNumber(typedWeights[key]) ? typedWeights[key] : Number.NaN), 0);
  if (!weightKeys.every((key) => isFiniteNumber(parsedWeights[key]) && parsedWeights[key] >= 0) || Math.abs(weightTotal - 100) > 0.0001) return null;

  const parsedReferences = {
    pendingVolume: typedReferences.pendingVolume,
    ageDays: typedReferences.ageDays,
    subgroupVolume: typedReferences.subgroupVolume,
  } as PriorityRuleConfig["references"];
  if (!Object.values(parsedReferences).every((value) => isFiniteNumber(value) && value > 0)) return null;

  const parsedThresholds = {
    urgent: typedThresholds.urgent,
    high: typedThresholds.high,
    medium: typedThresholds.medium,
  } as PriorityRuleConfig["thresholds"];
  if (!Object.values(parsedThresholds).every((value) => isFiniteNumber(value) && value >= 0 && value <= 100)) return null;
  if (!(parsedThresholds.urgent > parsedThresholds.high && parsedThresholds.high > parsedThresholds.medium)) return null;

  return { weights: parsedWeights, references: parsedReferences, thresholds: parsedThresholds };
}

function logarithmicScore(value: number, reference: number) {
  return Math.min(1, Math.log1p(value) / Math.log1p(reference));
}

export function calculatePriorityScore(
  input: PriorityInput,
  now = new Date(),
  config = DEFAULT_PRIORITY_RULE,
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
    logarithmicScore(input.pendingSkus, config.references.pendingVolume) * config.weights.pendingVolume +
    pendingRatio * config.weights.pendingPercentage +
    Math.min(1, ageInDays / config.references.ageDays) * config.weights.age +
    noDateRatio * config.weights.noDate +
    logarithmicScore(input.totalSkus, config.references.subgroupVolume) * config.weights.subgroupVolume;

  return Math.round(score * 10) / 10;
}

export function getPriority(
  score: number,
  pendingSkus: number,
  thresholds = DEFAULT_PRIORITY_RULE.thresholds,
): InventoryPriority {
  if (pendingSkus === 0) return "Atualizado";
  if (score >= thresholds.urgent) return "Urgente";
  if (score >= thresholds.high) return "Alta";
  if (score >= thresholds.medium) return "Média";
  return "Baixa";
}
