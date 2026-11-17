import assert from "node:assert/strict";
import { buildMultiComparison } from "../src/lib/comparacao-multipla";
import { comparar } from "../src/lib/comparacao";
import type { SavedAnalysis } from "../src/lib/divergencias-storage";
function record(id: string, date: string | undefined, values: [string, number][]): SavedAnalysis {
  return { id, name: `${id}.csv`, inventoryDate: date, savedAt: "2026-11-17T12:00:00Z", productCount: values.length,
    dataset: { name: id, warnings: [], items: values.map(([cod, div]) => ({ cod, desc: `Produto ${cod}`, atual: 10, cong: 10, inv: 10 + div, div })) } };
}
const a = record("a", "01/11/2026", [["001", -4], ["002", 0]]);
const b = record("b", "02/11/2026", [["001", -2], ["003", 5]]);
const c = record("c", "03/11/2026", [["001", 2], ["002", 0], ["003", -1]]);
const before = JSON.stringify([a,b,c]);
const oldComparison = comparar(a.dataset, b.dataset);
const result = buildMultiComparison([c,b,a]);
assert.deepEqual(result.records.map((r) => r.id), ["a","b","c"]);
assert.deepEqual(result.rows.find((r) => r.cod === "001")?.values, [-4,-2,2]);
assert.deepEqual(result.rows.find((r) => r.cod === "002")?.values, [0,null,0]);
assert.equal(result.rows.find((r) => r.cod === "002")?.presentes, 2);
assert.equal(result.rows.length, 3);
assert.equal(JSON.stringify([a,b,c]), before);
assert.deepEqual(comparar(a.dataset,b.dataset), oldComparison);
assert.equal(oldComparison.recorrentes[0].row.divA, result.rows[0].values[0]);
assert.equal(oldComparison.recorrentes[0].row.divB, result.rows[0].values[1]);
assert.equal(buildMultiComparison([a,a,b]).records.length, 2);
assert.equal(buildMultiComparison([a,record("d", a.inventoryDate, [])]).sameDate, true);
const invalid = record("unknown", "31/02/2026", []);
assert.equal(buildMultiComparison([b,invalid,a]).allDated, false);
assert.deepEqual(buildMultiComparison([b,invalid,a]).records.map((r) => r.id), ["b","unknown","a"]);
assert.throws(() => buildMultiComparison([a,record("dup", undefined, [["001",1],["001",3]])]), /repetido/);
assert.throws(() => buildMultiComparison([a,record("bad", undefined, [["001",NaN]])]), /inválida/);
assert.equal(buildMultiComparison([]).rows.length, 0);
const large = record("large", "04/11/2026", Array.from({length: 20000}, (_, i) => [`code${i}`, i % 3 - 1]));
assert.equal(buildMultiComparison([a,b,c,large]).rows.length, 20003);
console.log("Multi-inventory tests passed: union, missing/zero, signs, dates, duplicates, immutable pair regression and 20k products.");

import { describeProducts } from "../src/lib/divergencias-detalhes";
const described = describeProducts([a,b,c]);
assert.equal(described.get("001")?.shortages, 2);
assert.equal(described.get("001")?.surpluses, 1);
assert.equal(described.get("002")?.observed, 2);
assert.equal(described.get("002")?.missing, 1);
assert.equal(described.get("002")?.balanced, 2);
const alertRecord = record("alerts", a.inventoryDate, [["negative", 3], ["zero", -10]]);
alertRecord.dataset.items[0].cong = -3;
assert.equal(describeProducts([alertRecord]).get("negative")?.negativeFrozen, 1);
assert.equal(describeProducts([alertRecord]).get("zero")?.zeroCountWithStock, 1);
assert.throws(() => buildMultiComparison(Array.from({ length: 11 }, (_, i) => record(String(i), undefined, []))), /máximo 10/);
console.log("Detailed frequency/evidence, missing denominator, alert rules and 10-file cap tests passed.");
