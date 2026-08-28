import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const organizationAId = "11111111-1111-4111-8111-111111111111";
const organizationBId = "22222222-2222-4222-8222-222222222222";
const baseUrl = process.env.AUTH_TEST_BASE_URL ?? "http://localhost:3000";
const password = process.env.SEED_USER_PASSWORD;

if (!password) {
  throw new Error("SEED_USER_PASSWORD is required for the isolation test.");
}

const markerSections = ["Isolamento 12"];
const markerPlu = {
  alfa: "ISO-ALFA",
  beta: "ISO-BETA",
  betaOnly: "ISO-BETA-ONLY",
  importAlfa: "ISO-IMPORT-ALFA",
  importBeta: "ISO-IMPORT-BETA",
};
const importFilenames = ["iso-alfa-import.csv", "iso-beta-import.csv"];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
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

function getCookieHeader(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
}

async function login(email: string) {
  const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password }),
  });

  if (response.status !== 200) {
    throw new Error(`Login failed for ${email}: ${response.status}.`);
  }

  const cookie = getCookieHeader(response);

  if (!cookie) throw new Error(`Login for ${email} did not issue a session cookie.`);

  return cookie;
}

function createCsv(plu: string, description: string, stock: string) {
  return [
    "PLU;Código de barras;Descrição;Seção;Grupo;Subgrupo;Último inventário;Estoque atual",
    `${plu};7890000000000;${description};${markerSections[0]};Grupo iso;Subgrupo iso;2026-08-01;${stock}`,
  ].join("\n");
}

async function importFile(
  cookie: string,
  filename: string,
  plu: string,
  description: string,
  spoofedOrganizationId?: string,
) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([createCsv(plu, description, "7.5")], { type: "text/csv" }),
    filename,
  );

  if (spoofedOrganizationId) {
    form.append("organizationId", spoofedOrganizationId);
  }

  return expectStatus(
    `Import ${filename}`,
    fetch(`${baseUrl}/api/importacoes`, {
      method: "POST",
      body: form,
      headers: { cookie },
    }),
    200,
  );
}

async function seedTestProducts() {
  await prisma.product.createMany({
    data: [
      {
        organizationId: organizationAId,
        plu: markerPlu.alfa,
        description: "Produto isolado Alfa",
        section: markerSections[0],
        group: "Grupo iso",
        subgroup: "Subgrupo iso",
        currentStock: "1.5",
      },
      {
        organizationId: organizationBId,
        plu: markerPlu.beta,
        description: "Produto isolado Beta",
        section: markerSections[0],
        group: "Grupo iso",
        subgroup: "Subgrupo iso",
        currentStock: "2.5",
      },
      {
        organizationId: organizationBId,
        plu: markerPlu.betaOnly,
        description: "Produto exclusivo da Beta",
        section: markerSections[0],
        group: "Grupo iso",
        subgroup: "Subgrupo iso",
        currentStock: "3.5",
      },
    ],
  });
}

async function cleanTestData() {
  await prisma.stockHistory.deleteMany({
    where: { importRecord: { filename: { in: importFilenames } } },
  });
  await prisma.importRecord.deleteMany({
    where: { filename: { in: importFilenames } },
  });
  await prisma.product.deleteMany({
    where: { section: { in: markerSections } },
  });
}

async function testIsolation() {
  await cleanTestData();

  const cookieA = await login("ana@alfa.test");
  const cookieB = await login("bruno@beta.test");

  try {
    await seedTestProducts();

    const productsPageA = await expectStatus(
      "Organization A product list",
      fetch(`${baseUrl}/produtos?q=${markerPlu.alfa}`, { headers: { cookie: cookieA } }),
      200,
    );
    const productsPageAText = await productsPageA.text();

    assert(
      productsPageAText.includes("Produto isolado Alfa"),
      "Organization A did not see its own product.",
    );

    const productsPageB = await expectStatus(
      "Organization B product list",
      fetch(`${baseUrl}/produtos?q=${markerPlu.alfa}`, { headers: { cookie: cookieB } }),
      200,
    );
    const productsPageBText = await productsPageB.text();

    assert(
      !productsPageBText.includes("Produto isolado Alfa"),
      "Organization B saw a product from organization A.",
    );

    const productsPageBSearch = await expectStatus(
      "Organization B product list with own PLU",
      fetch(`${baseUrl}/produtos?q=${markerPlu.beta}`, { headers: { cookie: cookieB } }),
      200,
    );
    const productsPageBSearchText = await productsPageBSearch.text();

    assert(
      productsPageBSearchText.includes("Produto isolado Beta"),
      "Organization B did not see its own product.",
    );

    await expectStatus(
      "Organization A accessing organization B product by URL",
      fetch(`${baseUrl}/produtos/${markerPlu.betaOnly}`, { headers: { cookie: cookieA } }),
      404,
    );

    const ownDetail = await expectStatus(
      "Organization B accessing its own exclusive product",
      fetch(`${baseUrl}/produtos/${markerPlu.betaOnly}`, { headers: { cookie: cookieB } }),
      200,
    );
    const ownDetailText = await ownDetail.text();

    assert(
      ownDetailText.includes("Produto exclusivo da Beta"),
      "Organization B detail page did not show its own product.",
    );

    const alfaImport = await importFile(
      cookieA,
      importFilenames[0],
      markerPlu.importAlfa,
      "Produto importado Alfa",
      organizationBId,
    );
    const alfaImportBody = (await alfaImport.json()) as { importId: string };

    await importFile(
      cookieB,
      importFilenames[1],
      markerPlu.importBeta,
      "Produto importado Beta",
    );

    const alfaImportRecord = await prisma.importRecord.findUniqueOrThrow({
      where: { id: alfaImportBody.importId },
    });

    assert(
      alfaImportRecord.organizationId === organizationAId,
      "Client-supplied organization id changed the import ownership.",
    );

    const [alfaImports, betaImports] = await Promise.all([
      expectStatus(
        "Organization A import history",
        fetch(`${baseUrl}/importacoes`, { headers: { cookie: cookieA } }),
        200,
      ),
      expectStatus(
        "Organization B import history",
        fetch(`${baseUrl}/importacoes`, { headers: { cookie: cookieB } }),
        200,
      ),
    ]);
    const alfaImportsText = await alfaImports.text();
    const betaImportsText = await betaImports.text();

    assert(
      alfaImportsText.includes(importFilenames[0]) &&
        !alfaImportsText.includes(importFilenames[1]),
      "Organization A import history leaked data from organization B.",
    );
    assert(
      betaImportsText.includes(importFilenames[1]) &&
        !betaImportsText.includes(importFilenames[0]),
      "Organization B import history leaked data from organization A.",
    );

    await expectStatus(
      "Organization A accessing organization B imported product",
      fetch(`${baseUrl}/produtos/${markerPlu.importBeta}`, {
        headers: { cookie: cookieA },
      }),
      404,
    );

    const alfaImportedDetail = await expectStatus(
      "Organization A accessing its own imported product history",
      fetch(`${baseUrl}/produtos/${markerPlu.importAlfa}`, {
        headers: { cookie: cookieA },
      }),
      200,
    );
    const alfaImportedDetailText = await alfaImportedDetail.text();

    assert(
      alfaImportedDetailText.includes(importFilenames[0]),
      "Organization A detail page did not show its own import history.",
    );

    console.log("Page isolation, URL access control, import ownership, and API isolation passed.");
  } finally {
    await cleanTestData();
  }
}

testIsolation()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
