import "dotenv/config";
import { importProducts } from "../src/data/import-products";
import { clearOrganizationData } from "../src/data/organization-data";
import type { CsvProduct } from "../src/lib/csv";
import { prisma } from "../src/lib/prisma";

const organizationAId = "55555555-5555-4555-8555-555555555551";
const organizationBId = "55555555-5555-4555-8555-555555555552";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function row(plu: string): CsvProduct {
  return {
    plu,
    barcode: null,
    description: `Produto temporário ${plu}`,
    section: "Seção temporária",
    group: "Grupo temporário",
    subgroup: "Subgrupo temporário",
    lastInventory: "2026-08-28",
    currentStock: "12",
  };
}

async function removeOrganizations() {
  await prisma.inventoryCoverage.deleteMany({
    where: { organizationId: { in: [organizationAId, organizationBId] } },
  });
  await prisma.inventoryGoal.deleteMany({
    where: { organizationId: { in: [organizationAId, organizationBId] } },
  });
  await prisma.notification.deleteMany({
    where: { organizationId: { in: [organizationAId, organizationBId] } },
  });
  await prisma.organizationInvite.deleteMany({
    where: { organizationId: { in: [organizationAId, organizationBId] } },
  });
  await prisma.auditLog.deleteMany({
    where: { organizationId: { in: [organizationAId, organizationBId] } },
  });
  await prisma.stockHistory.deleteMany({
    where: { organizationId: { in: [organizationAId, organizationBId] } },
  });
  await prisma.importRecord.deleteMany({
    where: { organizationId: { in: [organizationAId, organizationBId] } },
  });
  await prisma.product.deleteMany({
    where: { organizationId: { in: [organizationAId, organizationBId] } },
  });
  await prisma.organization.deleteMany({
    where: { id: { in: [organizationAId, organizationBId] } },
  });
}

async function testClearOrganizationData() {
  await removeOrganizations();

  try {
    await prisma.organization.createMany({
      data: [
        { id: organizationAId, name: "Limpeza A" },
        { id: organizationBId, name: "Limpeza B" },
      ],
    });
    await importProducts({
      organizationId: organizationAId,
      filename: "clear-data-a.csv",
      fileHash: "clear-data-a",
      rows: [row("CLEAR-A")],
      errorRows: 0,
    });
    await importProducts({
      organizationId: organizationBId,
      filename: "clear-data-b.csv",
      fileHash: "clear-data-b",
      rows: [row("CLEAR-B")],
      errorRows: 0,
    });

    const counts = await clearOrganizationData(organizationAId);
    assert(counts.products === 1, "Organization A product was not removed.");
    assert(counts.imports === 1, "Organization A import was not removed.");
    assert(counts.stockHistory === 1, "Organization A snapshot was not removed.");

    const [organizationAProducts, organizationAImports, organizationAHistory, organizationBProduct] = await Promise.all([
      prisma.product.count({ where: { organizationId: organizationAId } }),
      prisma.importRecord.count({ where: { organizationId: organizationAId } }),
      prisma.stockHistory.count({ where: { organizationId: organizationAId } }),
      prisma.product.count({ where: { organizationId: organizationBId } }),
    ]);
    assert(organizationAProducts === 0, "Organization A products remain.");
    assert(organizationAImports === 0, "Organization A imports remain.");
    assert(organizationAHistory === 0, "Organization A stock history remains.");
    assert(organizationBProduct === 1, "Organization B data was affected.");
  } finally {
    await removeOrganizations();
  }

  console.log("Organization data cleanup transaction and tenant isolation passed.");
}

testClearOrganizationData()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
