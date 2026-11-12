import type { Item, Dataset } from "./divergencias";
import { parseInventoryDate } from "./inventory-date";

export type ComparacaoRow = {
  cod: string;
  desc: string;
  contadoA: number;
  contadoB: number;
  difContado: number;
  congeladoA: number;
  congeladoB: number;
  divA: number;
  divB: number;
  /** Custo médio do relatório mais recente (B), se veio no CSV. Nunca presumido. */
  custoMedioB?: number | null;
};

export type Recorrencia = { row: ComparacaoRow; tipo: "falta" | "sobra" };

export type Comparacao = {
  rows: ComparacaoRow[];
  soEmA: Item[];
  soEmB: Item[];
  recorrentes: Recorrencia[];
  semPadrao: ComparacaoRow[];
  soEmUmaData: ComparacaoRow[];
  comVariacaoContado: ComparacaoRow[];
  /** Quantos produtos aparecem nos dois arquivos (a comparação só olha para eles). */
  sobreposicao: { comuns: number; totalA: number; totalB: number };
};

/**
 * Compara dois inventários salvos (períodos diferentes).
 * Duas leituras separadas, sem misturar:
 * - a divergência de cada contagem (contado - congelado, de cada data);
 * - a variação de estoque entre as datas (contado de B - contado de A).
 * Critério de "quantidades parecidas" (inicial, fixo nesta versão; mudar exige alterar o código): mesmo sinal e a
 * menor quantidade valendo pelo menos metade da maior. A recorrência ajuda a
 * achar possíveis furos e erros para investigar; não prova causa nem perda.
 */
export function comparar(a: Dataset, b: Dataset): Comparacao {
  const mapA = new Map(a.items.map((i) => [i.cod, i]));
  const mapB = new Map(b.items.map((i) => [i.cod, i]));

  const rows: ComparacaoRow[] = [];
  for (const [cod, ia] of mapA) {
    const ib = mapB.get(cod);
    if (!ib) continue;
    rows.push({
      cod,
      desc: ib.desc || ia.desc,
      contadoA: ia.inv,
      contadoB: ib.inv,
      difContado: Math.round((ib.inv - ia.inv) * 1000) / 1000,
      congeladoA: ia.cong,
      congeladoB: ib.cong,
      divA: ia.div,
      divB: ib.div,
      custoMedioB: ib.custoMedio ?? null,
    });
  }

  const soEmA = a.items.filter((i) => !mapB.has(i.cod));
  const soEmB = b.items.filter((i) => !mapA.has(i.cod));

  const recorrentes: Recorrencia[] = [];
  const semPadrao: ComparacaoRow[] = [];
  const soEmUmaData: ComparacaoRow[] = [];
  for (const r of rows) {
    if (r.divA !== 0 && r.divB !== 0) {
      const mesmoSinal = r.divA * r.divB > 0;
      const mn = Math.min(Math.abs(r.divA), Math.abs(r.divB));
      const mx = Math.max(Math.abs(r.divA), Math.abs(r.divB));
      if (mesmoSinal && mn / mx >= 0.5) {
        recorrentes.push({ row: r, tipo: r.divA < 0 ? "falta" : "sobra" });
      } else {
        semPadrao.push(r);
      }
    } else if (r.divA !== 0 || r.divB !== 0) {
      soEmUmaData.push(r);
    }
  }
  recorrentes.sort((x, y) => Math.abs(y.row.divB) - Math.abs(x.row.divB));

  const comVariacaoContado = rows.filter((r) => r.difContado !== 0);

  const sobreposicao = { comuns: rows.length, totalA: mapA.size, totalB: mapB.size };

  return { rows, soEmA, soEmB, recorrentes, semPadrao, soEmUmaData, comVariacaoContado, sobreposicao };
}

/**
 * Garante que A é o inventário mais antigo quando as duas análises têm data
 * válida; trocadas pelo usuário, as datas vencem a seleção. Sem duas datas
 * válidas (texto antigo ou em branco), mantém a ordem escolhida e avisa com
 * datasValidas = false, para a tela pedir conferência manual.
 */
export function ordenarPorData<T extends { inventoryDate?: string }>(
  a: T,
  b: T,
): { a: T; b: T; trocou: boolean; datasValidas: boolean } {
  const da = parseInventoryDate(a.inventoryDate);
  const db = parseInventoryDate(b.inventoryDate);
  if (!da || !db) return { a, b, trocou: false, datasValidas: false };
  if (da.getTime() <= db.getTime()) return { a, b, trocou: false, datasValidas: true };
  return { a: b, b: a, trocou: true, datasValidas: true };
}

/**
 * Valor estimado da divergência mais recente (B) ao custo médio do relatório
 * de B. Só existe quando B trouxe custo médio válido (>= 0); custo ausente ou
 * inválido não gera valor inventado. É estimativa para ordenar a conferência,
 * nunca prova de perda ou ganho.
 */
export function valorEstimadoB(row: ComparacaoRow): number | null {
  const c = row.custoMedioB;
  if (c == null || !(c >= 0)) return null;
  const v = Math.round(row.divB * c * 100) / 100;
  return v === 0 ? 0 : v; // evita -0 quando custo ou divergência zeram o produto
}

/**
 * Cópia da lista de recorrências ordenada pelo módulo do valor estimado em B.
 * Quem não tem custo utilizável vai para o fim, mantendo a ordem original por
 * quantidade dentro de cada grupo. Não altera a classificação de recorrência.
 */
export function ordenarRecorrentesPorImpacto(recorrentes: Recorrencia[]): Recorrencia[] {
  const comValor = recorrentes.map((r, idx) => ({ r, idx, v: valorEstimadoB(r.row) }));
  comValor.sort((x, y) => {
    if (x.v == null && y.v == null) return x.idx - y.idx;
    if (x.v == null) return 1;
    if (y.v == null) return -1;
    const d = Math.abs(y.v) - Math.abs(x.v);
    return d !== 0 ? d : x.idx - y.idx;
  });
  return comValor.map((c) => c.r);
}
