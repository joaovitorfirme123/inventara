import "dotenv/config";
import { importProducts } from "../src/data/import-products";
import { listStockPositions, STOCK_PAGE_SIZE } from "../src/data/stock";
import type { CsvProduct } from "../src/lib/csv";
import { prisma } from "../src/lib/prisma";

const organizationAId = "11111111-1111-4111-8111-111111111111";
const organizationBId = "22222222-2222-4222-8222-222222222222";
const section = "Estoque teste";
const filenames = ["stock-page-first.csv", "stock-page-second.csv"];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function row(index: number, stock: string): CsvProduct {
  return {
    plu: `STK-${String(index).padStart(2, "0")}`,
    barcode: `7890000000${String(index).padStart(3, "0")}`,
    description: `Produto estoque ${String(index).padStart(2, "0")}`,
    section,
    group: "Grupo estoque",
    subgroup: "Subgrupo estoque",
    lastInventory: null,
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
  await prisma.product.deleteMany({ where: { section } });
}

async function testStockPage() {
  await cleanTestData();

  try {
    const rows = Array.from({ length: 12 }, (_, index) => row(index + 1, String(index + 1)));
    await importProducts({
      organizationId: organizationAId,
      filename: filenames[0],
      fileHash: "stock-page-hash-first",
      rows,
      errorRows: 0,
    });
    await importProducts({
      organizationId: organizationAId,
      filename: filenames[1],
      fileHash: "stock-page-hash-second",
      rows: [row(1, "14.5")],
      errorRows: 0,
    });

    const [pageOne, pageTwo, betaRows, search] = await Promise.all([
      listStockPositions({ organizationId: organizationAId, page: 1, section }),
      listStockPositions({ organizationId: organizationAId, page: 2, section }),
      listStockPositions({ organizationId: organizationBId, page: 1 }),
      listStockPositions({
        organizationId: organizationAId,
        page: 1,
        query: "STK-01",
      }),
    ]);

    assert(pageOne.rows.length === STOCK_PAGE_SIZE, "Stock page one is not full.");
    assert(pageTwo.rows.length === 2, "Stock page two is incorrect.");
    assert(pageOne.total === 12 && pageOne.totalPages === 2, "Stock pagination totals are incorrect.");
    assert(
      !betaRows.rows.some((item) => item.plu.startsWith("STK-")),
      "Stock positions leaked between organizations.",
    );

    const stk01 = search.rows.find((item) => item.plu === "STK-01");
    assert(stk01 !== undefined, "Search did not find the stock product.");
    assert(stk01.currentStock === "14.5", "Current stock is incorrect.");
    assert(stk01.previousStock === "1", "Previous stock is incorrect.");
    assert(stk01.variation === "13.5", "Stock variation is incorrect.");

    const noVariation = pageOne.rows.find((item) => item.plu === "STK-02");
    assert(noVariation?.currentStock === "2", "Single-snapshot current stock is incorrect.");
    assert(noVariation?.previousStock === null, "Single-snapshot previous stock is not null.");
    assert(noVariation?.variation === null, "Single-snapshot variation is not null.");
  } finally {
    await cleanTestData();
  }

  console.log("Stock page positions, variation, pagination, search, and isolation passed.");
}

testStockPage()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
