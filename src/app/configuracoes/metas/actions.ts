"use server";

import { revalidatePath } from "next/cache";
import { getInventoryRows } from "@/data/inventories";
import { saveInventoryGoal } from "@/data/inventory-goals";
import { requireOrganizationOwnerContext } from "@/lib/session";
import type { InventoryGoalState } from "./types";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function saveInventoryGoalAction(
  _previousState: InventoryGoalState,
  formData: FormData,
): Promise<InventoryGoalState> {
  const session = await requireOrganizationOwnerContext();
  const section = field(formData, "section");
  const year = Number.parseInt(field(formData, "year"), 10);
  const targetPercentage = Number.parseFloat(field(formData, "targetPercentage").replace(",", "."));

  if (!section || !Number.isInteger(year) || !Number.isFinite(targetPercentage) || targetPercentage < 0 || targetPercentage > 100) {
    return { status: "error", message: "Informe uma meta entre 0 e 100%." };
  }

  const rows = await getInventoryRows(session.user.organizationId, year);
  if (!rows.some((row) => row.section === section)) {
    return { status: "error", message: "A seção selecionada não pertence à organização atual." };
  }

  try {
    await saveInventoryGoal({
      organizationId: session.user.organizationId,
      year,
      section,
      targetPercentage,
    });
    revalidatePath("/configuracoes/metas");
    revalidatePath("/");
    return { status: "success", message: `Meta de ${targetPercentage}% salva para ${section}.` };
  } catch (error) {
    console.error("Failed to save inventory goal", {
      organizationId: session.user.organizationId,
      section,
      year,
      error,
    });
    return { status: "error", message: "Não foi possível salvar a meta." };
  }
}
