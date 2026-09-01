import "dotenv/config";
import { getDashboardData, selectDashboardRecommendations } from "../src/data/dashboard";
import { prisma } from "../src/lib/prisma";

const organizationAId = "11111111-1111-4111-8111-111111111111";
const organizationBId = "22222222-2222-4222-8222-222222222222";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function testDashboard() {
  const now = new Date("2026-08-28T12:00:00Z");
  const [dashboardA, dashboardB, productCountA, productCountB] = await Promise.all([
    getDashboardData(organizationAId, 2026, now),
    getDashboardData(organizationBId, 2026, now),
    prisma.product.count({ where: { organizationId: organizationAId } }),
    prisma.product.count({ where: { organizationId: organizationBId } }),
  ]);

  assert(dashboardA.summary.totalSkus === productCountA, "Dashboard total is incorrect.");
  assert(dashboardB.summary.totalSkus === productCountB, "Dashboard tenant isolation failed.");
  assert(
    dashboardA.sections.reduce((total, section) => total + section.totalSkus, 0) === productCountA,
    "Section totals do not match the dashboard total.",
  );
  assert(
    dashboardA.summary.countedSkus + dashboardA.summary.pendingSkus === productCountA,
    "Counted and pending totals are inconsistent.",
  );
  assert(
    dashboardA.priorities.reduce((total, item) => total + item.total, 0) ===
      dashboardA.summary.totalSubgroups,
    "Priority distribution is inconsistent.",
  );
  const recommendationFixture = [
    ["A", "A-1"], ["A", "A-2"], ["B", "B-1"], ["C", "C-1"], ["D", "D-1"], ["E", "E-1"], ["F", "F-1"],
  ].map(([groupKey, id], index) => ({
    id,
    plu: id,
    description: id,
    section: "Seção",
    group: groupKey,
    subgroup: id,
    currentStock: "0",
    lastInventory: null,
    priority: "Alta" as const,
    priorityScore: 100 - index,
    groupKey,
    lastInventoryTime: null,
  }));
  const recommendations = selectDashboardRecommendations(recommendationFixture);
  assert(recommendations.length === 6, "Dashboard did not select six recommendations.");
  assert(new Set(recommendations.map((item) => item.groupKey)).size === 6, "Dashboard repeated a group unnecessarily.");
  assert(
    dashboardA.sections.every(
      (section) => section.countedPercentage >= 0 && section.countedPercentage <= 100,
    ),
    "Section coverage is outside the valid range.",
  );

  console.log("Dashboard totals, sections, priorities, coverage, and isolation passed.");
}

testDashboard()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
