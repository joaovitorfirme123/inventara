"use server";

import { revalidatePath } from "next/cache";
import { createOrganizationWithOwner } from "@/data/organization-admin";
import { requirePlatformAdminContext } from "@/lib/session";
import type { OrganizationAdminState } from "./types";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function createOrganizationAction(
  _previousState: OrganizationAdminState,
  formData: FormData,
): Promise<OrganizationAdminState> {
  await requirePlatformAdminContext();

  const organizationName = field(formData, "organizationName");
  const ownerName = field(formData, "ownerName");
  const ownerEmail = field(formData, "ownerEmail").toLowerCase();
  const ownerPassword = String(formData.get("ownerPassword") ?? "");

  if (organizationName.length < 2 || ownerName.length < 2) {
    return { status: "error", message: "Informe nomes com pelo menos 2 caracteres." };
  }
  if (!ownerEmail.includes("@") || !ownerEmail.includes(".")) {
    return { status: "error", message: "Informe um e-mail válido para o owner." };
  }
  if (ownerPassword.length < 8) {
    return { status: "error", message: "A senha inicial deve ter pelo menos 8 caracteres." };
  }

  try {
    const organization = await createOrganizationWithOwner({
      organizationName,
      ownerName,
      ownerEmail,
      ownerPassword,
    });

    revalidatePath("/admin/organizacoes");

    return {
      status: "success",
      message: `Organização "${organization.organizationName}" criada com o owner ${ownerEmail}.`,
    };
  } catch (error) {
    console.error("Failed to create organization", { error });

    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return { status: "error", message: "Este e-mail já está vinculado a outro usuário." };
    }

    return { status: "error", message: "Não foi possível criar a organização." };
  }
}
