"use server";

import { revalidatePath } from "next/cache";
import { markNotificationAsRead } from "@/data/notifications";
import { requireOrganizationSessionContext } from "@/lib/session";

export async function markNotificationReadAction(formData: FormData) {
  const session = await requireOrganizationSessionContext();
  const notificationId = String(formData.get("notificationId") ?? "");
  if (!notificationId) return;

  await markNotificationAsRead(
    session.user.organizationId,
    session.user.id,
    notificationId,
  );
  revalidatePath("/notificacoes");
}
