import "dotenv/config";
import { randomUUID } from "node:crypto";
import { importProducts } from "../src/data/import-products";
import { getInventoryCoverageHistory } from "../src/data/inventory-coverage";
import { listInventoryGoals, saveInventoryGoal } from "../src/data/inventory-goals";
import { clearOrganizationData } from "../src/data/organization-data";
import type { CsvProduct } from "../src/lib/csv";
import { prisma } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function row(plu: string, section: string, lastInventory: string | null): CsvProduct {
  return {
    plu,
    barcode: null,
    description: `Produto de teste ${plu}`,
    section,
    group: "Grupo",
    subgroup: "Subgrupo",
    lastInventory,
    currentStock: "10",
  };
}

async function testInventoryGoals() {
  const organizationAId = randomUUID();
  const organizationBId = randomUUID();
  const year = new Date().getFullYear();

  try {
    await prisma.organization.createMany({
      data: [
        { id: organizationAId, name: "Metas A" },
        { id: organizationBId, name: "Metas B" },
      ],
    });
    await importProducts({
      organizationId: organizationAId,
      filename: "inventory-goals-test.csv",
      fileHash: `inventory-goals-test-${organizationAId}`,
      rows: [row("GOAL-A", "Mercearia", `${year}-08-28`), row("GOAL-B", "Frios", null)],
      errorRows: 0,
    });
    await importProducts({
      organizationId: organizationAId,
      filename: "inventory-goals-test-update.csv",
      fileHash: `inventory-goals-test-update-${organizationAId}`,
      rows: [row("GOAL-C", "Bebidas", `${year}-08-29`)],
      errorRows: 0,
    });

    await saveInventoryGoal({
      organizationId: organizationAId,
      year,
      section: "Mercearia",
      targetPercentage: 90,
    });
    const goals = await listInventoryGoals(organizationAId, year);
    const history = await getInventoryCoverageHistory(organizationAId, year);
    assert(goals.length === 1 && goals[0].targetPercentage === 90, "Inventory goal was not saved.");
    assert(history.length === 1, "Monthly coverage was not recorded.");
    assert(history[0].coveragePercentage === (2 / 3) * 100, "Monthly coverage is incorrect.");
    assert(history[0].goalPercentage === 90, "Monthly goal comparison is incorrect.");
    assert((await listInventoryGoals(organizationBId, year)).length === 0, "Goal tenant isolation failed.");
    assert((await getInventoryCoverageHistory(organizationBId, year)).length === 0, "Coverage tenant isolation failed.");
  } finally {
    await clearOrganizationData(organizationAId);
    await clearOrganizationData(organizationBId);
    await prisma.organization.deleteMany({ where: { id: { in: [organizationAId, organizationBId] } } });
  }

  console.log("Inventory goals, monthly coverage, comparison, and isolation passed.");
}

testInventoryGoals()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
