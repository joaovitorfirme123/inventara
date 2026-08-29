"use server";

import { revalidatePath } from "next/cache";
import {
  createOrganizationUser,
  deactivateOrganizationUser,
} from "@/data/organization-admin";
import { requireOrganizationOwnerContext } from "@/lib/session";
import type { UserAdminState } from "./types";

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function createOrganizationUserAction(
  _previousState: UserAdminState,
  formData: FormData,
): Promise<UserAdminState> {
  const session = await requireOrganizationOwnerContext();
  const name = field(formData, "name");
  const email = field(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2) return { status: "error", message: "Informe um nome válido." };
  if (!email.includes("@") || !email.includes(".")) return { status: "error", message: "Informe um e-mail válido." };
  if (password.length < 8) return { status: "error", message: "A senha deve ter pelo menos 8 caracteres." };

  try {
    await createOrganizationUser({
      organizationId: session.user.organizationId,
      name,
      email,
      password,
    });
    revalidatePath("/configuracoes/usuarios");
    return { status: "success", message: `Usuário ${email} criado como member.` };
  } catch (error) {
    console.error("Failed to create organization user", { organizationId: session.user.organizationId, error });
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return { status: "error", message: "Este e-mail já está vinculado a outro usuário." };
    }
    return { status: "error", message: "Não foi possível criar o usuário." };
  }
}

export async function deactivateOrganizationUserAction(
  _previousState: UserAdminState,
  formData: FormData,
): Promise<UserAdminState> {
  const session = await requireOrganizationOwnerContext();
  const userId = field(formData, "userId");

  try {
    await deactivateOrganizationUser({
      organizationId: session.user.organizationId,
      userId,
      actorId: session.user.id,
    });
    revalidatePath("/configuracoes/usuarios");
    return { status: "success", message: "Usuário desativado e sessões encerradas." };
  } catch (error) {
    console.error("Failed to deactivate organization user", { organizationId: session.user.organizationId, userId, error });
    const messages: Record<string, string> = {
      USER_NOT_FOUND: "Usuário não encontrado nesta organização.",
      CANNOT_DEACTIVATE_SELF: "Você não pode desativar o próprio acesso.",
      OWNER_CANNOT_BE_DEACTIVATED: "O owner não pode ser desativado nesta tela.",
    };
    return {
      status: "error",
      message: error instanceof Error ? messages[error.message] ?? "Não foi possível desativar o usuário." : "Não foi possível desativar o usuário.",
    };
  }
}
