import "dotenv/config";
import { importProducts } from "../src/data/import-products";
import { parseCsvBuffer } from "../src/lib/csv";
import { prisma } from "../src/lib/prisma";

const organizationAId = "11111111-1111-4111-8111-111111111111";
const organizationBId = "22222222-2222-4222-8222-222222222222";
const headers =
  "Código PLU;Código de barras;Descrição;Seção;Grupo;Subgrupo;Último Inventário;Estoque Atual";

function toBuffer(text: string) {
  return new TextEncoder().encode(text).buffer;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function testCsvImport() {
  const semicolonCsv = `${headers}\n990001;7899999990001;Produto CSV;Mercearia;Teste;Importado;27/08/2026;1.234,50\n;789;Sem PLU;;;;;10`;
  const semicolon = parseCsvBuffer(toBuffer(semicolonCsv));

  assert(semicolon.delimiter === ";", "Semicolon delimiter was not detected.");
  assert(semicolon.rows.length === 1, "Valid semicolon row was not parsed.");
  assert(semicolon.errors.length === 1, "Invalid PLU was not reported.");
  assert(semicolon.rows[0].lastInventory === "2026-08-27", "Date conversion failed.");
  assert(semicolon.rows[0].currentStock === "1234.50", "Decimal conversion failed.");

  const commaCsv =
    'Código PLU,Código de barras,Descrição,Seção,Grupo,Subgrupo,Último Inventário,Estoque Atual\n990002,7899999990002,Produto vírgula,Bebidas,Teste,Importado,2026-08-26,"10,5"';
  const comma = parseCsvBuffer(toBuffer(commaCsv));
  assert(comma.delimiter === ",", "Comma delimiter was not detected.");
  assert(comma.rows[0].currentStock === "10.5", "Quoted decimal was not converted.");

  const invalidHeaders = parseCsvBuffer(toBuffer("PLU;Descrição\n1;Produto"));
  assert(invalidHeaders.fatalErrors.length === 1, "Invalid headers were accepted.");

  const invalidFields = parseCsvBuffer(
    toBuffer(`${headers}\n990003;;Produto inválido;;;;31/02/2026;abc`),
  );
  assert(invalidFields.errors.length === 1, "Invalid date or stock was accepted.");

  const windowsText = `${headers}\n990004;;Café;;;;;2,5`;
  const windowsBytes = Uint8Array.from(Buffer.from(windowsText, "latin1"));
  const windows = parseCsvBuffer(windowsBytes.buffer);
  assert(windows.encoding === "Windows-1252", "Windows-1252 was not detected.");
  assert(windows.rows[0].description === "Café", "Windows-1252 was not decoded.");

  const erpHeaders =
    "Descrição;Código PLU;Código Barras;Descrição Seção;Descrição Grupo;Descrição SubGrupo;Data Últ. Inventário;Estoque Atual";
  const erpCsv = `${erpHeaders}\nARROZ TIPO 1 5KG;00010001;7891000000011;MERCEARIA;ARROZ E FEIJAO;ARROZ;25/08/2026;24,000`;
  const erpBytes = Uint8Array.from(Buffer.from(erpCsv, "latin1"));
  const erp = parseCsvBuffer(erpBytes.buffer);

  assert(erp.fatalErrors.length === 0, "ERP headers were not recognized.");
  assert(erp.encoding === "Windows-1252", "ERP encoding was not detected.");
  assert(erp.rows[0].plu === "00010001", "Leading zeroes in PLU were lost.");
  assert(erp.rows[0].section === "MERCEARIA", "ERP section was not mapped.");
  assert(erp.rows[0].group === "ARROZ E FEIJAO", "ERP group was not mapped.");
  assert(erp.rows[0].subgroup === "ARROZ", "ERP subgroup was not mapped.");
  assert(erp.rows[0].lastInventory === "2026-08-25", "ERP date was not mapped.");
  assert(erp.rows[0].currentStock === "24.000", "ERP stock was not mapped.");

  const reportCsv = `EMPRESA TESTE
CEP 00000000 CIDADE - UF
DOCUMENTO: 00.000.000/0000-00

${erpHeaders};
ARROZ TIPO 1 5KG;00010001;7891000000011;MERCEARIA;ARROZ E FEIJAO;ARROZ;25/08/2026;24,000;`;
  const report = parseCsvBuffer(toBuffer(reportCsv));

  assert(report.fatalErrors.length === 0, "Header after report preamble was not found.");
  assert(report.rows.length === 1, "Report row after preamble was not parsed.");
  assert(report.rows[0].plu === "00010001", "Report columns were not mapped.");

  await prisma.product.deleteMany({
    where: { plu: { in: ["990001", "990002"] } },
  });

  try {
    const first = await importProducts(organizationAId, semicolon.rows, semicolon.errors.length);
    const second = await importProducts(organizationAId, semicolon.rows, semicolon.errors.length);
    await importProducts(organizationBId, comma.rows, comma.errors.length);

    assert(first.insertedRows === 1 && first.errorRows === 1, "Insert summary is incorrect.");
    assert(second.updatedRows === 1, "Update summary is incorrect.");

    const [productA, productB] = await Promise.all([
      prisma.product.findUnique({
        where: { organizationId_plu: { organizationId: organizationAId, plu: "990001" } },
      }),
      prisma.product.findUnique({
        where: { organizationId_plu: { organizationId: organizationBId, plu: "990002" } },
      }),
    ]);

    assert(productA?.description === "Produto CSV", "Organization A import failed.");
    assert(productB?.description === "Produto vírgula", "Organization B import failed.");
  } finally {
    await prisma.product.deleteMany({
      where: { plu: { in: ["990001", "990002"] } },
    });
  }

  console.log("CSV parsing, validation, upsert, summary, and isolation passed.");
}

testCsvImport()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
