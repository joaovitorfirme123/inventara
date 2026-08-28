import "dotenv/config";
import { listStockPositions } from "../src/data/stock";
import { prisma } from "../src/lib/prisma";

const demoOrganizationId = "33333333-3333-4333-8333-333333333333";
const demoEmail = "demo@inventara.test";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function testDemoAccount() {
  const organization = await prisma.organization.findUnique({
    where: { id: demoOrganizationId },
    select: {
      name: true,
      users: {
        where: { email: demoEmail },
        select: { id: true, name: true, email: true, accounts: { select: { password: true } } },
      },
      products: {
        where: { plu: { startsWith: "DEMO-" } },
        select: { plu: true, stockHistory: { select: { stock: true } } },
      },
      imports: {
        where: { filename: { startsWith: "demo-inventario-" } },
        select: { filename: true },
      },
    },
  });

  assert(organization?.name === "Inventara Demo", "Demo organization is missing.");
  assert(organization.users.length === 1, "Demo user is missing.");
  assert(organization.users[0].name === "Marina Demo", "Demo user name is incorrect.");
  assert(
    organization.users[0].accounts.some((account) => account.password),
    "Demo credential account is missing.",
  );
  assert(organization.products.length === 12, "Demo product count is incorrect.");
  assert(
    organization.products.every((product) => product.stockHistory.length === 2),
    "Demo products do not have two stock snapshots.",
  );
  assert(organization.imports.length === 2, "Demo import history is incomplete.");

  const positions = await listStockPositions({
    organizationId: demoOrganizationId,
    page: 1,
  });
  assert(positions.total === 12, "Demo stock list count is incorrect.");
  assert(
    positions.rows.every((row) => row.previousStock !== null && row.variation !== null),
    "Demo stock variations are incomplete.",
  );

  const otherOrganization = await prisma.product.findFirst({
    where: {
      organizationId: { not: demoOrganizationId },
      plu: { startsWith: "DEMO-" },
    },
  });
  assert(otherOrganization === null, "Demo products leaked to another organization.");

  console.log("Demo organization, user, synthetic inventory, stock history, and isolation passed.");
}

testDemoAccount()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
