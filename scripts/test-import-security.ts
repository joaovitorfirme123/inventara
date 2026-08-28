import "dotenv/config";
import { importProducts } from "../src/data/import-products";
import {
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
} from "../src/lib/import-limits";
import { prisma } from "../src/lib/prisma";

const organizationAId = "11111111-1111-4111-8111-111111111111";
const baseUrl = process.env.AUTH_TEST_BASE_URL ?? "http://localhost:3000";
const password = process.env.SEED_USER_PASSWORD;

if (!password) {
  throw new Error("SEED_USER_PASSWORD is required for the import security test.");
}

const validCsv = [
  "PLU;Código de barras;Descrição;Seção;Grupo;Subgrupo;Último inventário;Estoque atual",
  "990101;7899999990101;Produto válido segurança;Seção;Grupo;Subgrupo;2026-08-01;2",
].join("\n");

const markerFilenames = ["security-valid.csv", "security-rollback.csv"];
const markerPlus = ["990101"];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function getCookieHeader(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
}

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email: "ana@alfa.test", password }),
  });

  if (response.status !== 200) {
    throw new Error(`Login failed: ${response.status}.`);
  }

  const cookie = getCookieHeader(response);

  if (!cookie) throw new Error("Login did not issue a session cookie.");

  return cookie;
}

function buildForm(content: string | Uint8Array<ArrayBuffer>, filename: string) {
  const form = new FormData();
  form.append("file", new Blob([content], { type: "text/csv" }), filename);
  return form;
}

async function expectStatus(
  label: string,
  request: Promise<Response>,
  expectedStatus: number,
) {
  const response = await request;

  if (response.status !== expectedStatus) {
    throw new Error(`${label}: expected ${expectedStatus}, received ${response.status}.`);
  }

  return response;
}

async function cleanTestData() {
  await prisma.stockHistory.deleteMany({
    where: { importRecord: { filename: { in: markerFilenames } } },
  });
  await prisma.importRecord.deleteMany({
    where: { filename: { in: markerFilenames } },
  });
  await prisma.product.deleteMany({
    where: { plu: { in: markerPlus } },
  });
}

async function testImportSecurity() {
  await cleanTestData();
  const cookie = await login();

  try {
    const invalidExtension = await expectStatus(
      "Invalid extension",
      fetch(`${baseUrl}/api/importacoes`, {
        method: "POST",
        body: buildForm(validCsv, "arquivo.txt"),
        headers: { cookie },
      }),
      400,
    );
    const invalidExtensionBody = (await invalidExtension.json()) as { error: string };
    assert(
      /\.csv/i.test(invalidExtensionBody.error),
      "Invalid extension message is not clear.",
    );

    const oversized = await expectStatus(
      "File above size limit",
      fetch(`${baseUrl}/api/importacoes`, {
        method: "POST",
        body: buildForm(new Uint8Array(MAX_IMPORT_FILE_BYTES + 1024), "grande.csv"),
        headers: { cookie },
      }),
      413,
    );
    const oversizedBody = (await oversized.json()) as { error: string };
    assert(
      /limite/i.test(oversizedBody.error),
      "Oversized file message is not clear.",
    );

    await expectStatus(
      "Corrupted CSV",
      fetch(`${baseUrl}/api/importacoes`, {
        method: "POST",
        body: buildForm(
          new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]),
          "corrompido.csv",
        ),
        headers: { cookie },
      }),
      422,
    );

    const tooManyRows = Array.from(
      { length: MAX_IMPORT_ROWS + 1 },
      (_, index) => `90000;${index};Desc;Seção;Grupo;Subgrupo;2026-08-01;1`,
    ).join("\n");
    const manyRows = await expectStatus(
      "Too many records",
      fetch(`${baseUrl}/api/importacoes`, {
        method: "POST",
        body: buildForm(`${validCsv.split("\n")[0]}\n${tooManyRows}`, "muitas.csv"),
        headers: { cookie },
      }),
      413,
    );
    const manyRowsBody = (await manyRows.json()) as { error: string };
    assert(
      /registros/.test(manyRowsBody.error),
      "Record limit message is not clear.",
    );

    const partialCsv = [
      "PLU;Código de barras;Descrição;Seção;Grupo;Subgrupo;Último inventário;Estoque atual",
      "990101;7899999990101;Produto válido segurança;Seção;Grupo;Subgrupo;2026-08-01;2",
      "990102;;;Seção;Grupo;Subgrupo;2026-08-01;2",
    ].join("\n");
    const validImport = await expectStatus(
      "Import with valid and invalid rows",
      fetch(`${baseUrl}/api/importacoes`, {
        method: "POST",
        body: buildForm(partialCsv, "security-valid.csv"),
        headers: { cookie },
      }),
      200,
    );
    const validImportBody = (await validImport.json()) as { errorRows: number; insertedRows: number };

    assert(validImportBody.errorRows === 1, "Invalid row was not counted.");
    assert(validImportBody.insertedRows === 1, "Valid row was not imported.");

    const storedImport = await prisma.importRecord.findFirst({
      where: { organizationId: organizationAId, filename: "security-valid.csv" },
    });

    if (!storedImport) throw new Error("Imported record was not stored.");

    assert(
      typeof storedImport.fileHash === "string" && storedImport.fileHash.length === 64,
      "File hash was not stored for the import.",
    );

    const duplicate = await expectStatus(
      "Duplicate import",
      fetch(`${baseUrl}/api/importacoes`, {
        method: "POST",
        body: buildForm(partialCsv, "security-valid.csv"),
        headers: { cookie },
      }),
      409,
    );
    const duplicateBody = (await duplicate.json()) as { error: string };
    assert(
      /já foi importado/i.test(duplicateBody.error),
      "Duplicate import message is not clear.",
    );

    const bogusOrganizationId = "99999999-9999-4999-8999-999999999999";
    await importProducts({
      organizationId: bogusOrganizationId,
      filename: markerFilenames[1],
      fileHash: "rollback-test-hash",
      rows: [],
      errorRows: 0,
    }).then(
      () => {
        throw new Error("Import with an unknown organization did not fail.");
      },
      () => undefined,
    );

    const rolledBack = await prisma.importRecord.findFirst({
      where: { filename: markerFilenames[1] },
    });
    assert(rolledBack === null, "Failed import left a partial record behind.");
  } finally {
    await cleanTestData();
  }

  console.log("Import limits, validation, duplication, rollback, and messages passed.");
}

testImportSecurity()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
