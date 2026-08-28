import "dotenv/config";
import { importProducts } from "../src/data/import-products";
import { getProductStockPosition } from "../src/data/stock-history";
import type { CsvProduct } from "../src/lib/csv";
import { prisma } from "../src/lib/prisma";

const organizationAId = "11111111-1111-4111-8111-111111111111";
const organizationBId = "22222222-2222-4222-8222-222222222222";
const plu = "STOCK-HISTORY-TEST";
const filenames = ["stock-first.csv", "stock-second.csv"];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function row(stock: string): CsvProduct {
  return {
    plu,
    barcode: null,
    description: "Produto histórico de estoque",
    section: "Teste",
    group: "Estoque",
    subgroup: "Snapshots",
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
  await prisma.product.deleteMany({ where: { organizationId: organizationAId, plu } });
}

async function testStockHistory() {
  await cleanTestData();

  try {
    await importProducts({
      organizationId: organizationAId,
      filename: filenames[0],
      fileHash: "stock-test-hash-first",
      rows: [row("10")],
      errorRows: 0,
    });
    const product = await prisma.product.findUniqueOrThrow({
      where: { organizationId_plu: { organizationId: organizationAId, plu } },
    });
    const firstPosition = await getProductStockPosition(organizationAId, product.id);

    assert(firstPosition?.currentStock === "10", "Initial current stock is incorrect.");
    assert(firstPosition.previousStock === null, "A new product has an unexpected previous stock.");
    assert(firstPosition.variation === null, "A new product has an unexpected variation.");

    await importProducts({
      organizationId: organizationAId,
      filename: filenames[1],
      fileHash: "stock-test-hash-second",
      rows: [row("14.5")],
      errorRows: 0,
    });

    const [snapshots, position, crossTenantPosition] = await Promise.all([
      prisma.stockHistory.findMany({
        where: { organizationId: organizationAId, productId: product.id },
        orderBy: { recordedAt: "asc" },
      }),
      getProductStockPosition(organizationAId, product.id),
      getProductStockPosition(organizationBId, product.id),
    ]);

    assert(snapshots.length === 2, "Two imports did not preserve two snapshots.");
    assert(snapshots[0].stock.toString() === "10", "The first snapshot was changed.");
    assert(snapshots[1].stock.toString() === "14.5", "The latest snapshot is incorrect.");
    assert(position?.currentStock === "14.5", "Current stock was not updated.");
    assert(position.previousStock === "10", "Previous stock is incorrect.");
    assert(position.variation === "4.5", "Stock variation is incorrect.");
    assert(crossTenantPosition === null, "Stock history leaked between organizations.");
  } finally {
    await cleanTestData();
  }

  console.log("Stock snapshots, preservation, variation, new products, and isolation passed.");
}

testStockHistory()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
