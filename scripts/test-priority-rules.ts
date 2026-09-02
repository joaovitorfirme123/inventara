import "dotenv/config";
import { createInventoryPlan } from "../src/data/inventory-plans";
import { getInventoryRows } from "../src/data/inventories";
import {
  getActivePriorityRule,
  savePriorityRule,
} from "../src/data/priority-rules";
import { parsePriorityRuleConfig } from "../src/lib/inventory-priority";
import { prisma } from "../src/lib/prisma";

const organizationAId = "11111111-1111-4111-8111-111111111111";
const organizationBId = "22222222-2222-4222-8222-222222222222";
const actorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const section = "ZZ Priority Rule";
const group = "Grupo configurável";
const subgroup = "Subgrupo configurável";

const customConfiguration = {
  weights: {
    pendingVolume: 100,
    pendingPercentage: 0,
    age: 0,
    noDate: 0,
    subgroupVolume: 0,
  },
  references: {
    pendingVolume: 1,
    ageDays: 365,
    subgroupVolume: 100,
  },
  thresholds: {
    urgent: 90,
    high: 60,
    medium: 30,
  },
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function clean() {
  await prisma.inventoryPlan.deleteMany({ where: { organizationId: organizationAId, section } });
  await prisma.product.deleteMany({ where: { organizationId: organizationAId, section } });
  const rule = await prisma.priorityRule.findUnique({ where: { organizationId: organizationAId }, select: { id: true } });
  if (rule) {
    await prisma.auditLog.deleteMany({ where: { entityId: rule.id } });
    await prisma.priorityRule.delete({ where: { id: rule.id } });
  }
}

async function testPriorityRules() {
  assert(!parsePriorityRuleConfig({ ...customConfiguration, weights: { ...customConfiguration.weights, age: 1 } }), "Invalid weight total was accepted.");
  assert(!parsePriorityRuleConfig({ ...customConfiguration, thresholds: { urgent: 20, high: 65, medium: 35 } }), "Invalid threshold order was accepted.");
  await clean();
  try {
    await prisma.product.create({
      data: {
        organizationId: organizationAId,
        plu: "PRIORITY-RULE-1",
        description: "Produto da regra configurável",
        section,
        group,
        subgroup,
        lastInventory: new Date("2024-01-01T00:00:00Z"),
      },
    });

    const first = await savePriorityRule({
      organizationId: organizationAId,
      actorId,
      name: "Regra de teste",
      configuration: customConfiguration,
    });
    const second = await savePriorityRule({
      organizationId: organizationAId,
      actorId,
      name: "Regra de teste atualizada",
      configuration: { ...customConfiguration, thresholds: { urgent: 95, high: 65, medium: 35 } },
    });
    assert(first.version === 1 && second.version === 2, "Priority rule revisions were not versioned.");

    const rows = await getInventoryRows(organizationAId, 2026, new Date("2026-09-01T12:00:00Z"));
    const row = rows.find((item) => item.section === section && item.group === group && item.subgroup === subgroup);
    assert(row?.priority === "Urgente", "Custom priority rule did not affect the score.");
    assert(row?.priorityRule.name === "Regra de teste atualizada" && row.priorityRule.version === 2, "Active rule was not shown with the score.");

    const plan = await createInventoryPlan({ organizationId: organizationAId, target: { section, group, subgroup } });
    const persistedPlan = await prisma.inventoryPlan.findUnique({
      where: { id: plan.id },
      include: { priorityRuleRevision: true },
    });
    assert(persistedPlan?.priorityRuleRevision?.id === second.revisionId, "Planning did not snapshot the active rule revision.");

    const organizationBRule = await getActivePriorityRule(organizationBId);
    assert(organizationBRule.revisionId === null, "Priority rule crossed organization boundary.");
  } finally {
    await clean();
  }

  console.log("Priority rule validation, versioning, scoring, planning snapshot, fallback, and isolation passed.");
}

testPriorityRules()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
