import { getInventoryRows } from "@/data/inventories";
import { listInventoryGoals } from "@/data/inventory-goals";
import { prisma } from "@/lib/prisma";

export type NotificationItem = {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  generatedAt: Date;
  readAt: Date | null;
};

type NotificationCondition = {
  dedupeKey: string;
  type: string;
  severity: string;
  title: string;
  message: string;
};

function notificationConditions(
  rows: Awaited<ReturnType<typeof getInventoryRows>>,
  goals: Awaited<ReturnType<typeof listInventoryGoals>>,
  year: number,
) {
  const conditions: NotificationCondition[] = rows
    .filter((row) => row.priority === "Urgente")
    .map((row) => ({
      dedupeKey: `priority:${year}:${row.section}:${row.group}:${row.subgroup}`,
      type: "PRIORITY",
      severity: "critical",
      title: "Subgrupo urgente",
      message: `${row.section} / ${row.group} / ${row.subgroup} tem ${row.pendingSkus} SKUs pendentes e pontuação ${row.score.toFixed(1)}.`,
    }));
  const sectionTotals = new Map<string, { totalSkus: number; countedSkus: number }>();
  for (const row of rows) {
    const section = sectionTotals.get(row.section) ?? { totalSkus: 0, countedSkus: 0 };
    section.totalSkus += row.totalSkus;
    section.countedSkus += row.countedSkus;
    sectionTotals.set(row.section, section);
  }
  for (const goal of goals) {
    const section = sectionTotals.get(goal.section);
    const coverage = section && section.totalSkus > 0
      ? (section.countedSkus / section.totalSkus) * 100
      : 0;
    if (coverage >= goal.targetPercentage) continue;
    conditions.push({
      dedupeKey: `goal:${year}:${goal.section}`,
      type: "GOAL",
      severity: "warning",
      title: "Meta de cobertura abaixo do esperado",
      message: `${goal.section} está em ${coverage.toFixed(1)}% de cobertura, abaixo da meta de ${goal.targetPercentage.toFixed(1)}%.`,
    });
  }
  return conditions;
}

export async function syncNotifications(organizationId: string, year: number) {
  const [rows, goals] = await Promise.all([
    getInventoryRows(organizationId, year),
    listInventoryGoals(organizationId, year),
  ]);
  const conditions = notificationConditions(rows, goals, year);
  const keys = conditions.map((condition) => condition.dedupeKey);

  await prisma.$transaction(async (transaction) => {
    for (const condition of conditions) {
      await transaction.notification.upsert({
        where: {
          organizationId_dedupeKey: {
            organizationId,
            dedupeKey: condition.dedupeKey,
          },
        },
        update: {
          type: condition.type,
          severity: condition.severity,
          title: condition.title,
          message: condition.message,
          resolvedAt: null,
        },
        create: { organizationId, ...condition },
      });
    }
    await transaction.notification.updateMany({
      where: {
        organizationId,
        resolvedAt: null,
        ...(keys.length > 0 && { dedupeKey: { notIn: keys } }),
      },
      data: { resolvedAt: new Date() },
    });
  });

  return conditions.length;
}

export function listNotificationsForUser(organizationId: string, userId: string) {
  return prisma.notification.findMany({
    where: { organizationId, resolvedAt: null },
    orderBy: [{ generatedAt: "desc" }, { id: "desc" }],
    take: 50,
    select: {
      id: true,
      type: true,
      severity: true,
      title: true,
      message: true,
      generatedAt: true,
      reads: {
        where: { userId },
        select: { readAt: true },
        take: 1,
      },
    },
  }).then((notifications) => notifications.map((notification) => ({
    id: notification.id,
    type: notification.type,
    severity: notification.severity,
    title: notification.title,
    message: notification.message,
    generatedAt: notification.generatedAt,
    readAt: notification.reads[0]?.readAt ?? null,
  } satisfies NotificationItem)));
}

export async function markNotificationAsRead(
  organizationId: string,
  userId: string,
  notificationId: string,
) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, organizationId, resolvedAt: null },
    select: { id: true },
  });
  if (!notification) return false;

  await prisma.notificationRead.upsert({
    where: { notificationId_userId: { notificationId, userId } },
    update: { readAt: new Date() },
    create: { notificationId, userId },
  });
  return true;
}
