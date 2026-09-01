import "dotenv/config";

import {
  createInventoryPlan,
  listInventoryPlans,
  updateInventoryPlan,
} from "../src/data/inventory-plans";
import { prisma } from "../src/lib/prisma";

const organizationAId = "11111111-1111-4111-8111-111111111111";
const organizationBId = "22222222-2222-4222-8222-222222222222";
const section = "Planejamento teste";
const group = "Grupo planejamento";
const subgroup = "Subgrupo planejamento";
const plu = "PLAN-TEST-001";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function clean() {
  await prisma.inventoryPlan.deleteMany({
    where: { organizationId: organizationAId, subgroup },
  });
  await prisma.product.deleteMany({ where: { organizationId: organizationAId, plu } });
}

async function testInventoryPlans() {
  await clean();
  await prisma.product.create({
    data: {
      organizationId: organizationAId,
      plu,
      description: "Produto de planejamento",
      section,
      group,
      subgroup,
      currentStock: "12.5",
    },
  });

  try {
    const plan = await createInventoryPlan({
      organizationId: organizationAId,
      target: { section, group, subgroup },
      plannedDate: "2026-09-15",
      responsibleName: "Pessoa externa",
    });
    assert(plan.status === "PENDING", "New inventory plan should start as pending.");

    const plans = await listInventoryPlans(organizationAId, "PENDING");
    assert(plans.some((item) => item.id === plan.id && item.pendingSkus === 1 && item.responsibleName === "Pessoa externa"), "Plan was not listed with its target snapshot.");
    assert(!(await listInventoryPlans(organizationBId)).some((item) => item.id === plan.id), "Plan leaked between organizations.");

    await updateInventoryPlan({ organizationId: organizationAId, planId: plan.id, plannedDate: "2026-09-16", responsibleName: "Outra pessoa", status: "SCHEDULED" });
    await updateInventoryPlan({ organizationId: organizationAId, planId: plan.id, plannedDate: "2026-09-16", responsibleName: "Outra pessoa", status: "IN_PROGRESS" });
    await updateInventoryPlan({ organizationId: organizationAId, planId: plan.id, plannedDate: "2026-09-16", responsibleName: "Outra pessoa", status: "COMPLETED" });

    let invalidTransition = false;
    try {
      await updateInventoryPlan({ organizationId: organizationAId, planId: plan.id, plannedDate: "2026-09-16", responsibleName: "Outra pessoa", status: "PENDING" });
    } catch (error: unknown) {
      invalidTransition = error instanceof Error && error.message === "INVALID_TRANSITION";
    }
    assert(invalidTransition, "Completed plans accepted an invalid transition.");
  } finally {
    await clean();
  }

  console.log("Inventory plan creation, updates, transitions, snapshots, and isolation passed.");
}

testInventoryPlans()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
