"use server";

import { acceptOrganizationInvitation } from "@/data/invitations";
import type { InvitationActionState } from "@/app/configuracoes/usuarios/invitation-types";

export async function acceptInvitationAction(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (name.length < 2) return { status: "error", message: "Informe um nome válido.", token: null };
  if (password.length < 8) return { status: "error", message: "A senha deve ter pelo menos 8 caracteres.", token: null };

  try {
    await acceptOrganizationInvitation({ token, name, password });
    return { status: "success", message: "Convite aceito. Você já pode entrar na sua conta.", token: null };
  } catch (error) {
    const messages: Record<string, string> = {
      INVITE_NOT_FOUND: "Convite não encontrado.",
      INVITE_ACCEPTED: "Este convite já foi aceito.",
      INVITE_REVOKED: "Este convite foi revogado.",
      INVITE_EXPIRED: "Este convite expirou.",
      EMAIL_ALREADY_EXISTS: "Este e-mail já pertence a um usuário.",
    };
    return { status: "error", message: error instanceof Error ? messages[error.message] ?? "Não foi possível aceitar o convite." : "Não foi possível aceitar o convite.", token: null };
  }
}
