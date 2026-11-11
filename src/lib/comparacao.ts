import type { Item, Dataset } from "./divergencias";

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

  return { rows, soEmA, soEmB, recorrentes, semPadrao, soEmUmaData, comVariacaoContado };
}
