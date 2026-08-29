"use server";

import { revalidatePath } from "next/cache";
import { clearOrganizationData } from "@/data/organization-data";
import { requireOrganizationOwnerContext } from "@/lib/session";
import type { ClearOrganizationState } from "@/app/configuracoes/types";

export async function clearCurrentOrganizationData(
  _previousState: ClearOrganizationState,
  formData: FormData,
): Promise<ClearOrganizationState> {
  const session = await requireOrganizationOwnerContext();

  if (formData.get("confirmation") !== "APAGAR TUDO") {
    return {
      status: "error",
      message: "Digite APAGAR TUDO para confirmar a limpeza.",
      counts: null,
    };
  }

  try {
    const counts = await clearOrganizationData(session.user.organizationId);

    revalidatePath("/", "layout");

    return {
      status: "success",
      message: "A base da organização foi limpa com sucesso.",
      counts,
    };
  } catch (error) {
    console.error("Failed to clear organization data", {
      organizationId: session.user.organizationId,
      error,
    });

    return {
      status: "error",
      message: "Não foi possível limpar os dados. Tente novamente ou consulte os logs da aplicação.",
      counts: null,
    };
  }
}
