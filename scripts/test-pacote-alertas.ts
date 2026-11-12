/**
 * Testes unitários do pacote de alertas/impacto financeiro estimado.
 * Roda sem banco: npx tsx scripts/test-pacote-alertas.ts
 */
import assert from "node:assert/strict";
import { comparar, ordenarRecorrentesPorImpacto, valorEstimadoB, type Recorrencia } from "../src/lib/comparacao";
import type { Dataset, Item } from "../src/lib/divergencias";

function item(cod: string, div: number, custoMedio: number | null): Item {
  return { cod, desc: `PRODUTO ${cod}`, atual: 10, cong: 10, inv: 10 + div, div, custoMedio };
}

// comparar carrega o custo médio de B na linha, sem presumir o de A
const a: Dataset = { name: "A", warnings: [], items: [item("1", -5, null), item("2", 4, null)] };
const b: Dataset = { name: "B", warnings: [], items: [item("1", -4, 2.5), item("2", 3, null)] };
const cmp = comparar(a, b);
const row1 = cmp.rows.find((r) => r.cod === "1")!;
assert.equal(row1.custoMedioB, 2.5, "custoMedioB vem do item de B");
assert.equal(cmp.rows.find((r) => r.cod === "2")!.custoMedioB, null, "sem custo em B fica null, nunca presumido");

// valorEstimadoB: divB × custo de B; ausente/negativo -> null (não inventa valor)
assert.equal(valorEstimadoB(row1), -10, "divB -4 × 2,50 = -10");
assert.equal(valorEstimadoB({ ...row1, custoMedioB: null }), null);
assert.equal(valorEstimadoB({ ...row1, custoMedioB: -3 }), null, "custo negativo não gera valor");
assert.equal(valorEstimadoB({ ...row1, custoMedioB: 0 }), 0, "custo zero gera 0 explícito, não null");

// ordenarRecorrentesPorImpacto: módulo do valor desc; sem custo ao final; estável
const recs: Recorrencia[] = [
  { row: { ...row1, cod: "p1", divB: -1, custoMedioB: 2 }, tipo: "falta" },   // |v| = 2
  { row: { ...row1, cod: "p2", divB: -1, custoMedioB: null }, tipo: "falta" }, // sem custo
  { row: { ...row1, cod: "p3", divB: -9, custoMedioB: 10 }, tipo: "falta" },  // |v| = 90
  { row: { ...row1, cod: "p4", divB: -1, custoMedioB: undefined }, tipo: "falta" }, // sem custo
];
const ord = ordenarRecorrentesPorImpacto(recs);
assert.deepEqual(ord.map((r) => r.row.cod), ["p3", "p1", "p2", "p4"], "impacto desc, sem custo ao fim, estável");
// não muta a lista original (ordenação padrão por quantidade continua intacta)
assert.deepEqual(recs.map((r) => r.row.cod), ["p1", "p2", "p3", "p4"], "lista original preservada");

console.log("OK: pacote alertas/impacto financeiro — todos os testes passaram");
