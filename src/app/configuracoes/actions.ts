"use server";

import { revalidatePath } from "next/cache";
import { clearOrganizationData } from "@/data/organization-data";
import { getOptionalSessionContext } from "@/lib/session";

export type ClearOrganizationState = {
  status: "idle" | "success" | "error";
  message: string;
  counts: {
    products: number;
    imports: number;
    stockHistory: number;
  } | null;
};

export const initialClearOrganizationState: ClearOrganizationState = {
  status: "idle",
  message: "",
  counts: null,
};

export async function clearCurrentOrganizationData(
  _previousState: ClearOrganizationState,
  formData: FormData,
): Promise<ClearOrganizationState> {
  let session;

  try {
    session = await getOptionalSessionContext();
  } catch (error) {
    console.error("Failed to load session for organization cleanup", { error });
    return {
      status: "error",
      message: "Não foi possível validar sua sessão. Faça login novamente e tente outra vez.",
      counts: null,
    };
  }

  if (!session) {
    return {
      status: "error",
      message: "Sua sessão expirou. Faça login novamente e tente outra vez.",
      counts: null,
    };
  }

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
