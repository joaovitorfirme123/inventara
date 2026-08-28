import "dotenv/config";
import { getDashboardData } from "../src/data/dashboard";
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
