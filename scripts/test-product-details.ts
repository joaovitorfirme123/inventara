import "dotenv/config";
import { importProducts } from "../src/data/import-products";
import { getProductDetailsByPlu } from "../src/data/stock-history";
import type { CsvProduct } from "../src/lib/csv";
import { prisma } from "../src/lib/prisma";

const organizationAId = "11111111-1111-4111-8111-111111111111";
const organizationBId = "22222222-2222-4222-8222-222222222222";
const plu = "PRODUCT-DETAIL-TEST";
const filenames = ["detail-first.csv", "detail-second.csv"];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function row(stock: string): CsvProduct {
  return {
    plu,
    barcode: "7890000000999",
    description: "Produto de detalhe",
    section: "Seção teste",
    group: "Grupo teste",
    subgroup: "Subgrupo teste",
    lastInventory: "2026-08-20",
    currentStock: stock,
  };
}

async function cleanTestData() {
  await prisma.stockHistory.deleteMany({
    where: { importRecord: { filename: { in: filenames } } },
  });
  await prisma.importRecord.deleteMany({
    where: { filename: { in: filenames } },
  });
  await prisma.product.deleteMany({ where: { organizationId: organizationAId, plu } });
}

async function testProductDetails() {
  await cleanTestData();

  try {
    await importProducts({
      organizationId: organizationAId,
      filename: filenames[0],
      fileHash: "detail-test-hash-first",
      rows: [row("8")],
      errorRows: 0,
    });
    await importProducts({
      organizationId: organizationAId,
      filename: filenames[1],
      fileHash: "detail-test-hash-second",
      rows: [row("11.5")],
      errorRows: 0,
    });

    const [details, missing, crossTenant] = await Promise.all([
      getProductDetailsByPlu(organizationAId, plu),
      getProductDetailsByPlu(organizationAId, "PLU-INEXISTENTE"),
      getProductDetailsByPlu(organizationBId, plu),
    ]);

    assert(details !== null, "Existing product details were not found.");
    assert(details.description === "Produto de detalhe", "Description is incorrect.");
    assert(details.barcode === "7890000000999", "Barcode is incorrect.");
    assert(
      details.section === "Seção teste" &&
        details.group === "Grupo teste" &&
        details.subgroup === "Subgrupo teste",
      "Product classification is incorrect.",
    );
    assert(details.lastInventory?.toISOString().startsWith("2026-08-20"), "Inventory date is incorrect.");
    assert(details.currentStock === "11.5", "Current stock is incorrect.");
    assert(details.previousStock === "8", "Previous stock is incorrect.");
    assert(details.variation === "3.5", "Variation is incorrect.");
    assert(details.history.length === 2, "Product history is incomplete.");
    assert(details.history[0].filename === filenames[1], "History is not newest first.");
    assert(details.history[1].stock === "8", "Old snapshot was not preserved.");
    assert(missing === null, "Missing product unexpectedly exists.");
    assert(crossTenant === null, "Product details leaked between organizations.");
  } finally {
    await cleanTestData();
  }

  console.log("Product details, history, variation, missing state, and isolation passed.");
}

testProductDetails()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
