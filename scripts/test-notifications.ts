import "dotenv/config";
import { randomUUID } from "node:crypto";
import { importProducts } from "../src/data/import-products";
import { clearOrganizationData } from "../src/data/organization-data";
import { saveInventoryGoal } from "../src/data/inventory-goals";
import {
  listNotificationsForUser,
  markNotificationAsRead,
  syncNotifications,
} from "../src/data/notifications";
import type { CsvProduct } from "../src/lib/csv";
import { prisma } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function testNotifications() {
  const organizationAId = randomUUID();
  const organizationBId = randomUUID();
  const userId = randomUUID();
  const year = new Date().getFullYear();
  const row: CsvProduct = {
    plu: "NOTIFICATION-A",
    barcode: null,
    description: "Produto de notificação",
    section: "Mercearia",
    group: "Grupo",
    subgroup: "Subgrupo",
    lastInventory: null,
    currentStock: "10",
  };

  try {
    await prisma.organization.createMany({
      data: [
        { id: organizationAId, name: "Alertas A" },
        { id: organizationBId, name: "Alertas B" },
      ],
    });
    await prisma.user.create({
      data: { id: userId, name: "Usuário de alertas", email: `${userId}@alerts.test`, organizationId: organizationAId },
    });
    await importProducts({
      organizationId: organizationAId,
      filename: "notifications-test.csv",
      fileHash: `notifications-test-${organizationAId}`,
      rows: [row],
      errorRows: 0,
    });
    await saveInventoryGoal({ organizationId: organizationAId, year, section: "Mercearia", targetPercentage: 100 });

    assert(await syncNotifications(organizationAId, year) === 1, "Notification was not generated.");
    assert(await syncNotifications(organizationAId, year) === 1, "Notification sync returned an unexpected count.");
    assert(await prisma.notification.count({ where: { organizationId: organizationAId } }) === 1, "Notification was duplicated.");
    const unread = await listNotificationsForUser(organizationAId, userId);
    assert(unread.length === 1 && unread[0].readAt === null, "Notification was not listed as unread.");
    assert(await markNotificationAsRead(organizationAId, userId, unread[0].id), "Notification could not be marked as read.");
    assert((await listNotificationsForUser(organizationAId, userId))[0].readAt !== null, "Read state was not persisted.");
    assert((await listNotificationsForUser(organizationBId, randomUUID())).length === 0, "Notification isolation failed.");

    await saveInventoryGoal({ organizationId: organizationAId, year, section: "Mercearia", targetPercentage: 0 });
    await syncNotifications(organizationAId, year);
    assert((await listNotificationsForUser(organizationAId, userId)).length === 0, "Resolved notification remained active.");
  } finally {
    await clearOrganizationData(organizationAId);
    await clearOrganizationData(organizationBId);
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.organization.deleteMany({ where: { id: { in: [organizationAId, organizationBId] } } });
  }

  console.log("Notification generation, deduplication, read state, resolution, and isolation passed.");
}

testNotifications()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
