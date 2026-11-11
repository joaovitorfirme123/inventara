import type { Dataset } from "./divergencias";

/**
 * Estrutura de uma análise de divergências salva no banco do Inventara
 * (Postgres via Prisma, por organização). A validação é a fonte única da
 * estrutura: o servidor aceita exatamente o que o navegador sabe ler de volta.
 */

export type SavedAnalysis = {
  id: string;
  savedAt: string; // ISO - quando a análise foi salva
  inventoryDate?: string; // data do inventário informada por quem salvou (texto livre, ex.: 03/11/2026)
  name: string;
  productCount: number;
  dataset: Dataset;
};

export const MAX_ANALISES = 50;

const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Confere a estrutura e os números de uma análise antes de aceitar (salvar ou carregar). */
export function isValidAnalysis(r: unknown): r is SavedAnalysis {
  const a = r as SavedAnalysis | null;
  if (!a || typeof a !== "object" || typeof a.id !== "string" || !a.id) return false;
  if (typeof a.name !== "string" || typeof a.savedAt !== "string") return false;
  const d = a.dataset;
  if (!d || typeof d !== "object" || !Array.isArray(d.items)) return false;
  return d.items.every(
    (i) =>
      !!i &&
      typeof i.cod === "string" &&
      i.cod.length > 0 &&
      typeof i.desc === "string" &&
      fin(i.cong) &&
      fin(i.inv) &&
      fin(i.div) &&
      fin(i.atual),
  );
}
