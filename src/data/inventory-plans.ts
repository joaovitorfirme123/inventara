import { getInventoryRows } from "@/data/inventories";
import type { InventoryPlanStatus } from "@/lib/inventory-plan";
import { canTransitionInventoryPlanStatus } from "@/lib/inventory-plan";
import { prisma } from "@/lib/prisma";

export type InventoryPlanTarget = {
  section: string;
  group: string;
  subgroup: string;
};

export type InventoryPlanListItem = {
  id: string;
  section: string;
  group: string;
  subgroup: string;
  priority: string;
  priorityScore: number;
  totalSkus: number;
  pendingSkus: number;
  plannedDate: string | null;
  responsibleName: string | null;
  status: InventoryPlanStatus;
  createdAt: string;
};

function parsePlannedDate(value: string | null | undefined) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("INVALID_DATE");

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("INVALID_DATE");
  }
  return date;
}

async function getTargetSnapshot(
  organizationId: string,
  target: InventoryPlanTarget,
) {
  const rows = await getInventoryRows(organizationId);
  const row = rows.find(
    (item) =>
      item.section === target.section &&
      item.group === target.group &&
      item.subgroup === target.subgroup,
  );
  if (!row) throw new Error("INVALID_TARGET");
  return row;
}

export async function listInventoryPlans(
  organizationId: string,
  status?: InventoryPlanStatus,
): Promise<InventoryPlanListItem[]> {
  const plans = await prisma.inventoryPlan.findMany({
    where: { organizationId, ...(status ? { status } : {}) },
    orderBy: [{ plannedDate: "asc" }, { createdAt: "desc" }],
  });

  return plans.map((plan) => ({
    id: plan.id,
    section: plan.section,
    group: plan.group,
    subgroup: plan.subgroup,
    priority: plan.priority,
    priorityScore: plan.priorityScore,
    totalSkus: plan.totalSkus,
    pendingSkus: plan.pendingSkus,
    plannedDate: plan.plannedDate?.toISOString().slice(0, 10) ?? null,
    responsibleName: plan.responsibleName,
    status: plan.status,
    createdAt: plan.createdAt.toISOString(),
  }));
}

export async function createInventoryPlan({
  organizationId,
  target,
  plannedDate,
  responsibleName,
}: {
  organizationId: string;
  target: InventoryPlanTarget;
  plannedDate?: string | null;
  responsibleName?: string | null;
}) {
  const snapshot = await getTargetSnapshot(organizationId, target);
  return prisma.inventoryPlan.create({
    data: {
      organizationId,
      section: snapshot.section,
      group: snapshot.group,
      subgroup: snapshot.subgroup,
      priority: snapshot.priority,
      priorityScore: snapshot.score,
      totalSkus: snapshot.totalSkus,
      pendingSkus: snapshot.pendingSkus,
      plannedDate: parsePlannedDate(plannedDate),
      responsibleName: responsibleName?.trim() || null,
    },
  });
}

export async function updateInventoryPlan({
  organizationId,
  planId,
  plannedDate,
  responsibleName,
  status,
}: {
  organizationId: string;
  planId: string;
  plannedDate?: string | null;
  responsibleName?: string | null;
  status: InventoryPlanStatus;
}) {
  const plan = await prisma.inventoryPlan.findFirst({
    where: { id: planId, organizationId },
    select: { status: true },
  });
  if (!plan) throw new Error("PLAN_NOT_FOUND");
  if (!canTransitionInventoryPlanStatus(plan.status, status)) {
    throw new Error("INVALID_TRANSITION");
  }

  return prisma.inventoryPlan.update({
    where: { id: planId },
    data: {
      plannedDate: parsePlannedDate(plannedDate),
      responsibleName: responsibleName?.trim() || null,
      status,
    },
  });
}

export async function deleteInventoryPlan(organizationId: string, planId: string) {
  const result = await prisma.inventoryPlan.deleteMany({
    where: { id: planId, organizationId },
  });
  if (result.count === 0) throw new Error("PLAN_NOT_FOUND");
}
