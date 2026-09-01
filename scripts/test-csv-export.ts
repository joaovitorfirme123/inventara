import { serializeProductsToCsv } from "../src/lib/csv";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const csv = serializeProductsToCsv([
  {
    plu: "00010001",
    barcode: null,
    description: "Arroz; tipo 1",
    section: "Mercearia",
    group: null,
    subgroup: null,
    lastInventory: "25/08/2026",
    currentStock: "24.000",
  },
]);

assert(csv.startsWith("Código PLU;Código de barras;Descrição;"), "CSV header is incorrect.");
assert(csv.includes('"Arroz; tipo 1"'), "CSV values were not escaped.");
assert(csv.includes("00010001"), "PLU leading zeroes were not preserved.");
assert(csv.includes("\r\n"), "CSV does not use compatible line endings.");

console.log("Current product CSV serialization passed.");
