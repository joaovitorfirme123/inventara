import type { SavedAnalysis } from "./divergencias-storage";
import { parseInventoryDate } from "./inventory-date";

export type MultiRow = { cod: string; desc: string; values: (number | null)[]; presentes: number };

/** Descriptive view only. Missing is not zero; no sums or new recurrence rule. */
export function buildMultiComparison(input: SavedAnalysis[]) {
  if (input.length > 10) throw new Error("Selecione no máximo 10 inventários por vez.");
  const unique = [...new Map(input.map((r) => [r.id, r])).values()];
  const dated = unique.map((record, index) => ({ record, index, date: parseInventoryDate(record.inventoryDate)?.getTime() ?? null }));
  const allDated = dated.every((r) => r.date !== null);
  if (allDated) dated.sort((a, b) => a.date! - b.date! || a.index - b.index);
  const records = dated.map((r) => r.record);
  const dates = dated.map((r) => r.date).filter((d): d is number => d !== null);
  const sameDate = new Set(dates).size !== dates.length;
  const rows = new Map<string, MultiRow>();
  const ambiguousCodes = new Set<string>();
  for (const [column, record] of records.entries()) {
    const seen = new Set<string>();
    for (const item of record.dataset.items) {
      if (!item.cod || !Number.isFinite(item.div)) throw new Error("Uma análise contém código vazio ou divergência inválida. Confira o arquivo antes de comparar.");
      if (seen.has(item.cod)) ambiguousCodes.add(item.cod);
      seen.add(item.cod);
      let row = rows.get(item.cod);
      if (!row) {
        row = { cod: item.cod, desc: item.desc, values: Array(records.length).fill(null), presentes: 0 };
        rows.set(item.cod, row);
      }
      if (row.values[column] === null) row.presentes++;
      row.values[column] = item.div;
      if (item.desc) row.desc = item.desc;
    }
  }
  // Never silently choose or add duplicate codes inside one snapshot.
  if (ambiguousCodes.size) throw new Error(`${ambiguousCodes.size} código(s) repetido(s) dentro de uma análise. Corrija a duplicidade no CSV antes de comparar; nenhum valor foi somado.`);
  return { records, rows: [...rows.values()], allDated, sameDate };
}
