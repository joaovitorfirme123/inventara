import type { SavedAnalysis } from "./divergencias-storage";

/** Descriptive counts, not a new definition of recurrence or evidence of cause. */
export type ProductDetails = {
  cod: string;
  observed: number;
  missing: number;
  shortages: number;
  surpluses: number;
  balanced: number;
  negativeFrozen: number;
  zeroCountWithStock: number;
  evidence: { analysisId: string; divergence: number; frozen: number; counted: number; negativeFrozen: boolean; zeroCountWithStock: boolean }[];
};

export function describeProducts(records: SavedAnalysis[]): Map<string, ProductDetails> {
  const details = new Map<string, ProductDetails>();
  for (const record of records) {
    const seen = new Set<string>();
    for (const item of record.dataset.items) {
      if (seen.has(item.cod)) throw new Error("Código repetido dentro de uma análise: confira o CSV.");
      seen.add(item.cod);
      let detail = details.get(item.cod);
      if (!detail) {
        detail = { cod: item.cod, observed: 0, missing: 0, shortages: 0, surpluses: 0, balanced: 0, negativeFrozen: 0, zeroCountWithStock: 0, evidence: [] };
        details.set(item.cod, detail);
      }
      detail.observed++;
      if (item.div < 0) detail.shortages++;
      else if (item.div > 0) detail.surpluses++;
      else detail.balanced++;
      const negativeFrozen = item.cong < 0;
      const zeroCountWithStock = item.inv === 0 && item.cong > 0;
      if (negativeFrozen) detail.negativeFrozen++;
      if (zeroCountWithStock) detail.zeroCountWithStock++;
      detail.evidence.push({ analysisId: record.id, divergence: item.div, frozen: item.cong, counted: item.inv, negativeFrozen, zeroCountWithStock });
    }
  }
  for (const detail of details.values()) detail.missing = records.length - detail.observed;
  return details;
}
