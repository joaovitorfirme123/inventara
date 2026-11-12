import { analyze, type Item } from "@/lib/divergencias";
import type { SavedAnalysis } from "@/lib/divergencias-storage";

/**
 * Exporta o histórico de análises salvas como CSV (separado por ponto e vírgula,
 * números no formato brasileiro), uma linha por produto por análise.
 * O JSON continua sendo o backup completo; este CSV é para conferir em planilha.
 * Nenhum valor é calculado ou estimado: só entram os números que já estavam salvos.
 *
 * Células de texto que começam com =, +, - ou @ (mesmo depois de espaços ou
 * controles) ganham um apóstrofo inicial, para a planilha não interpretar como
 * fórmula. Colunas numéricas nunca passam por esse tratamento: um número
 * negativo continua número.
 */

const HEADER = [
  "arquivo",
  "data_inventario",
  "salva_em",
  "codigo",
  "descricao",
  "plu",
  "embalagem",
  "saldo_congelado",
  "saldo_atual",
  "contagem",
  "divergencia",
  "ultima_qtd",
  "ultima_data",
  "custo_reposicao",
  "custo_medio",
  "sinais",
];

/** Escapa aspas, quebras de linha e o separador. */
function csvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
  return value;
}

/** Neutraliza texto que uma planilha poderia ler como fórmula. Só para campos de texto. */
function csvText(value: string): string {
  if (!value || value.startsWith("'")) return value;
  const semBordas = value.replace(/^[\s\u0000-\u001F]+/, "");
  if (/^[=+\-@]/.test(semBordas)) return "'" + value;
  return value;
}

function numBr(n: number | null | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  return String(n).replace(".", ",");
}

function sinaisDoItem(item: Item, a: ReturnType<typeof analyze>): string {
  const s: string[] = [];
  if (a.negCong.some((i) => i.cod === item.cod)) s.push("saldo_congelado_negativo");
  if (a.zeroCount.some((i) => i.cod === item.cod)) s.push("contagem_zero_com_saldo");
  if (a.negAtual.some((i) => i.cod === item.cod)) s.push("saldo_atual_negativo");
  if (a.top.some((i) => i.cod === item.cod)) s.push("entre_maiores_divergencias");
  return s.join(" | ");
}

export function buildHistoricoCsv(records: SavedAnalysis[]): string {
  const lines: string[] = [HEADER.map(csvCell).join(";")];
  for (const r of records) {
    const analysis = analyze(r.dataset.items);
    for (const item of r.dataset.items) {
      const row = [
        csvText(r.name),
        csvText(r.inventoryDate ?? ""),
        csvText(r.savedAt),
        csvText(item.cod),
        csvText(item.desc),
        csvText(item.plu ?? ""),
        csvText(item.emb ?? ""),
        numBr(item.cong),
        numBr(item.atual),
        numBr(item.inv),
        numBr(item.div),
        item.ultimaQtd === null || item.ultimaQtd === undefined ? "" : numBr(item.ultimaQtd),
        csvText(item.ultimaData ?? ""),
        item.custoRep === null || item.custoRep === undefined ? "" : numBr(item.custoRep),
        item.custoMedio === null || item.custoMedio === undefined ? "" : numBr(item.custoMedio),
        csvText(sinaisDoItem(item, analysis)),
      ];
      lines.push(row.map(csvCell).join(";"));
    }
  }
  return lines.join("\r\n");
}
