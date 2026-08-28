import "dotenv/config";
import {
  filterInventoryRows,
  getInventoryRows,
} from "../src/data/inventories";
import { calculatePriorityScore } from "../src/lib/inventory-priority";
import { prisma } from "../src/lib/prisma";

const organizationAId = "11111111-1111-4111-8111-111111111111";
const organizationBId = "22222222-2222-4222-8222-222222222222";
const testSections = ["ZZ Motor A", "ZZ Motor B"];
const now = new Date("2026-08-27T12:00:00Z");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function cleanTestProducts() {
  await prisma.product.deleteMany({
    where: {
      section: { in: testSections },
    },
  });
}

async function testInventories() {
  const oneOldProductScore = calculatePriorityScore(
    {
      totalSkus: 1,
      pendingSkus: 1,
      noDateSkus: 0,
      oldestPendingDate: new Date("2020-01-01T00:00:00Z"),
    },
    now,
  );
  const largePendingGroupScore = calculatePriorityScore(
    {
      totalSkus: 200,
      pendingSkus: 100,
      noDateSkus: 0,
      oldestPendingDate: new Date("2020-01-01T00:00:00Z"),
    },
    now,
  );

  assert(
    largePendingGroupScore > oneOldProductScore,
    "A single old product dominated a large pending subgroup.",
  );

  await cleanTestProducts();

  try {
    await prisma.product.createMany({
      data: [
        {
          organizationId: organizationAId,
          plu: "INV-A-1",
          description: "Contado no ano",
          section: testSections[0],
          group: "Grupo A",
          subgroup: "Subgrupo misto",
          lastInventory: new Date("2026-03-10T00:00:00Z"),
        },
        {
          organizationId: organizationAId,
          plu: "INV-A-2",
          description: "Pendente antigo",
          section: testSections[0],
          group: "Grupo A",
          subgroup: "Subgrupo misto",
          lastInventory: new Date("2024-01-15T00:00:00Z"),
        },
        {
          organizationId: organizationAId,
          plu: "INV-A-3",
          description: "Pendente sem data",
          section: testSections[0],
          group: "Grupo A",
          subgroup: "Subgrupo misto",
          lastInventory: null,
        },
        {
          organizationId: organizationAId,
          plu: "INV-A-4",
          description: "Subgrupo atualizado",
          section: testSections[0],
          group: "Grupo B",
          subgroup: "Subgrupo atualizado",
          lastInventory: new Date("2026-06-20T00:00:00Z"),
        },
        {
          organizationId: organizationAId,
          plu: "INV-B-1",
          description: "Outra seção",
          section: testSections[1],
          group: "Grupo C",
          subgroup: "Subgrupo antigo",
          lastInventory: new Date("2025-02-01T00:00:00Z"),
        },
        {
          organizationId: organizationBId,
          plu: "INV-CROSS-1",
          description: "Outro tenant",
          section: testSections[0],
          group: "Grupo secreto",
          subgroup: "Subgrupo secreto",
          lastInventory: null,
        },
      ],
    });

    const rows = await getInventoryRows(organizationAId, 2026, now);
    const testRows = rows.filter((row) => testSections.includes(row.section));
    const mixed = testRows.find((row) => row.subgroup === "Subgrupo misto");
    const updated = testRows.find(
      (row) => row.subgroup === "Subgrupo atualizado",
    );
    const otherSection = testRows.find(
      (row) => row.subgroup === "Subgrupo antigo",
    );

    assert(testRows.length === 3, "Tenant data leaked into inventory groups.");
    assert(mixed?.totalSkus === 3, "Total SKU aggregation is incorrect.");
    assert(mixed.countedSkus === 1, "Current-year count is incorrect.");
    assert(mixed.pendingSkus === 2, "Pending count is incorrect.");
    assert(mixed.noDateSkus === 1, "No-date count is incorrect.");
    assert(mixed.countedPercentage === 33.3, "Coverage percentage is incorrect.");
    assert(
      mixed.oldestDate?.toISOString().startsWith("2024-01-15"),
      "Oldest date is incorrect.",
    );
    assert(
      mixed.newestDate?.toISOString().startsWith("2026-03-10"),
      "Newest date is incorrect.",
    );
    assert(updated?.priority === "Atualizado", "Updated subgroup priority is incorrect.");
    assert(mixed.rank === 1 && updated.rank === 2, "Ranking within section is incorrect.");
    assert(otherSection?.rank === 1, "Ranking did not restart in a new section.");

    const pendingRows = filterInventoryRows(testRows, { pendingOnly: true });
    const priorityRows = filterInventoryRows(testRows, {
      priority: mixed.priority,
    });
    const sectionRows = filterInventoryRows(testRows, {
      section: testSections[1],
    });
    const queryRows = filterInventoryRows(testRows, { query: "Subgrupo misto" });
    const noMatchRows = filterInventoryRows(testRows, { query: "inexistente" });
    const urgentRows = filterInventoryRows(testRows, { urgentOnly: true });

    assert(pendingRows.length === 2, "Pending-only filter is incorrect.");
    assert(priorityRows.includes(mixed), "Priority filter is incorrect.");
    assert(sectionRows.length === 1, "Section filter is incorrect.");
    assert(queryRows.length === 1 && queryRows[0].subgroup === "Subgrupo misto", "Search filter is incorrect.");
    assert(noMatchRows.length === 0, "Search with no match returned rows.");
    assert(
      urgentRows.every((row) => row.priority === "Urgente"),
      "Urgent-only filter returned non-urgent rows.",
    );

    const nameRows = await getInventoryRows(
      organizationAId,
      2026,
      now,
      "name",
    );
    const nameTestRows = nameRows.filter((row) => testSections.includes(row.section));
    const nameA = nameTestRows
      .filter((row) => row.section === testSections[0])
      .map((row) => row.group);
    assert(
      nameA.every((group, index) => index === 0 || group >= nameA[index - 1]),
      "Name sort is not alphabetical within a section.",
    );

    const coverageRows = await getInventoryRows(
      organizationAId,
      2026,
      now,
      "coverage",
    );
    const coverageTestRows = coverageRows.filter(
      (row) => row.section === testSections[0],
    );
    assert(
      coverageTestRows.every(
        (row, index) =>
          index === 0 ||
          row.countedPercentage >= coverageTestRows[index - 1].countedPercentage,
      ),
      "Coverage sort is not ascending within a section.",
    );

    const pendingSortedRows = await getInventoryRows(
      organizationAId,
      2026,
      now,
      "pending",
    );
    const pendingSortedTestRows = pendingSortedRows.filter(
      (row) => row.section === testSections[0],
    );
    assert(
      pendingSortedTestRows.every(
        (row, index) =>
          index === 0 ||
          row.pendingSkus <= pendingSortedTestRows[index - 1].pendingSkus,
      ),
      "Pending sort is not descending within a section.",
    );

    const sectionOrder = rows.map((row) => row.section);
    const sortedOrder = [...sectionOrder].sort((left, right) =>
      left.localeCompare(right, "pt-BR"),
    );
    assert(
      sectionOrder.every((section, index) => section === sortedOrder[index]),
      "Sections are not in alphabetical order.",
    );
  } finally {
    await cleanTestProducts();
  }

  console.log("Inventory aggregation, priorities, ranking, search, sorting, filters, and isolation passed.");
}

testInventories()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
