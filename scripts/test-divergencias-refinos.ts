/**
 * Testes dos refinamentos de divergências (sem banco):
 * - data do inventário: validação, normalização e erro de futuro
 * - ordenação A/B pela data na comparação
 * - indicador de produtos em comum (sobreposição)
 * - proteção da amostra e impressão digital para duplicatas
 *
 * Roda com: npx tsx scripts/test-divergencias-refinos.ts
 */
import assert from "node:assert/strict";
import { comparar, ordenarPorData } from "../src/lib/comparacao";
import { datasetFingerprint, inventoryDateKey } from "../src/lib/divergencias-fingerprint";
import { isSampleDataset, SAMPLE_ITEMS } from "../src/lib/divergencias-amostra";
import { inventoryDateError, normalizeInventoryDate, parseInventoryDate } from "../src/lib/inventory-date";
import type { Dataset, Item } from "../src/lib/divergencias";

function item(cod: string, cong: number, inv: number, div: number, atual: number): Item {
  return { cod, desc: `PRODUTO ${cod}`, cong, inv, div, atual };
}
function ds(items: Item[]): Dataset {
  return { name: "teste", items, warnings: [] };
}

// --- Data do inventário ---
assert.equal(normalizeInventoryDate("9/11/2026"), "09/11/2026");
assert.equal(normalizeInventoryDate("09/11/2026"), "09/11/2026");
assert.equal(normalizeInventoryDate("31/02/2026"), null, "31 de fevereiro não é data real");
assert.equal(normalizeInventoryDate("2026-11-09"), null, "formato ISO não é aceito no campo");
assert.equal(normalizeInventoryDate(""), null);
assert.equal(inventoryDateError(""), null, "data em branco continua válida (opcional)");
assert.equal(inventoryDateError("  "), null);
assert.equal(inventoryDateError("12/11/2026"), null, "data de hoje é válida");
assert.equal(inventoryDateError("12/11/2099"), null, "data futura não é bloqueada: só se exige data real");
assert.ok(inventoryDateError("abc")?.includes("DD/MM/AAAA"));
assert.ok(parseInventoryDate("29/02/2028"), "ano bissexto válido");
assert.equal(parseInventoryDate("29/02/2027"), null, "2027 não é bissexto");

// --- Ordenação A/B ---
type An = { id: string; inventoryDate?: string };
const antiga: An = { id: "1", inventoryDate: "11/11/2026" };
const recente: An = { id: "2", inventoryDate: "12/11/2026" };
let ord = ordenarPorData(recente, antiga);
assert.equal(ord.a.id, "1", "a mais antiga vira A");
assert.equal(ord.b.id, "2");
assert.equal(ord.trocou, true);
assert.equal(ord.datasValidas, true);
ord = ordenarPorData(antiga, recente);
assert.equal(ord.trocou, false, "ordem já correta não troca");
ord = ordenarPorData<An>({ id: "1" }, recente);
assert.equal(ord.datasValidas, false, "sem as duas datas, mantém a escolha");
assert.equal(ord.a.id, "1");
ord = ordenarPorData<An>({ id: "1", inventoryDate: "texto livre antigo" }, recente);
assert.equal(ord.datasValidas, false, "data legada inválida não ordena");

// --- Sobreposição (produtos em comum) ---
const A = ds([item("1", 10, 12, 2, 12), item("2", 5, 5, 0, 5), item("3", 8, 6, -2, 6)]);
const B = ds([item("2", 5, 4, -1, 4), item("3", 8, 6, -2, 6), item("4", 1, 1, 0, 1)]);
const cmp = comparar(A, B);
assert.deepEqual(cmp.sobreposicao, { comuns: 2, totalA: 3, totalB: 3 });
assert.equal(cmp.soEmA.length, 1);
assert.equal(cmp.soEmB.length, 1);
const C = ds([item("9", 1, 1, 0, 1)]);
const cmpSemComum = comparar(A, C);
assert.equal(cmpSemComum.sobreposicao.comuns, 0, "setores diferentes: zero em comum");
assert.equal(cmpSemComum.recorrentes.length, 0);

// Regra de recorrência preservada: mesmo sinal e menor >= metade da maior
const D1 = ds([item("1", 10, 8, -2, 8)]);
const D2 = ds([item("1", 10, 9, -1, 9)]);
assert.equal(comparar(D1, D2).recorrentes.length, 1, "-2 e -1: menor é metade da maior");
const D3 = ds([item("1", 10, 7, -3, 7)]);
assert.equal(comparar(D1, D3).recorrentes.length, 1, "-2 e -3: 2/3 >= metade, é recorrência");
const D5 = ds([item("1", 10, 6, -4, 6)]);
assert.equal(comparar(D3, D5).recorrentes.length, 1, "-3 e -4: 3/4 >= metade");
assert.equal(comparar(D5, ds([item("1", 10, 9, -1, 9)])).recorrentes.length, 0, "-4 e -1: 1/4 abaixo da metade");
const D4 = ds([item("1", 10, 12, 2, 12)]);
assert.equal(comparar(D1, D4).recorrentes.length, 0, "sinais opostos não são recorrência");

// --- Amostra protegida ---
assert.equal(isSampleDataset({ name: "amostra", items: SAMPLE_ITEMS, warnings: [] }), true);
assert.equal(isSampleDataset(ds([item("1", 1, 1, 0, 1)])), false);
const amostraAlterada = SAMPLE_ITEMS.map((i, idx) => (idx === 0 ? { ...i, cod: "999" } : i));
assert.equal(isSampleDataset({ name: "amostra", items: amostraAlterada, warnings: [] }), false, "amostra editada não casa");
const mesmoCodigoQuantidadeDiferente = SAMPLE_ITEMS.map((i) => ({ ...i, inv: i.inv + 1, div: i.div + 1 }));
assert.equal(
  isSampleDataset({ name: "real", items: mesmoCodigoQuantidadeDiferente, warnings: [] }),
  false,
  "CSV real com códigos coincidentes mas quantidades diferentes NÃO é recusado",
);

// --- Impressão digital para duplicatas ---
const fp1 = datasetFingerprint(A);
const fp2 = datasetFingerprint(ds([item("1", 10, 12, 2, 12), item("2", 5, 5, 0, 5), item("3", 8, 6, -2, 6)]));
assert.equal(fp1, fp2, "mesmo conteúdo, mesma impressão");
const fp3 = datasetFingerprint(ds([item("1", 10, 12, 2, 12), item("2", 5, 5, 0, 5), item("3", 8, 7, -1, 7)]));
assert.notEqual(fp1, fp3, "quantidade diferente muda a impressão");
assert.equal(datasetFingerprint({ name: "x" }), null, "estrutura inválida não quebra");

// --- Duplicata = mesmo conteúdo E mesma data de inventário ---
assert.equal(inventoryDateKey("9/11/2026"), inventoryDateKey("09/11/2026"), "datas equivalentes casam");
assert.notEqual(inventoryDateKey("11/11/2026"), inventoryDateKey("12/11/2026"), "datas diferentes não casam");
assert.equal(inventoryDateKey(undefined), inventoryDateKey(null), "ausência de data casa com ausência");
assert.notEqual(inventoryDateKey(undefined), inventoryDateKey("11/11/2026"));
assert.equal(inventoryDateKey("texto antigo"), "texto antigo", "data legada fora do formato compara como veio");
const dupMesmoDia =
  datasetFingerprint(A) === datasetFingerprint(ds(A.items.map((i) => ({ ...i })))) &&
  inventoryDateKey("11/11/2026") === inventoryDateKey("11/11/2026");
assert.equal(dupMesmoDia, true, "mesmo conteúdo + mesma data = duplicata");
const repeticaoLegitima =
  datasetFingerprint(A) === datasetFingerprint(ds(A.items.map((i) => ({ ...i })))) &&
  inventoryDateKey("11/11/2026") === inventoryDateKey("12/11/2026");
assert.equal(repeticaoLegitima, false, "mesmo conteúdo em outra data NÃO é duplicata");

console.log("OK: todos os testes dos refinamentos de divergências passaram.");
