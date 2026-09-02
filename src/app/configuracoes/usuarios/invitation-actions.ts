"use server";

import { revalidatePath } from "next/cache";
import {
  createOrganizationInvitation,
  revokeOrganizationInvitation,
} from "@/data/invitations";
import { requireOrganizationOwnerContext } from "@/lib/session";
import type { InvitationActionState } from "./invitation-types";

const initialState: InvitationActionState = { status: "idle", message: "", token: null };

export async function createInvitationAction(
  _previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  const session = await requireOrganizationOwnerContext();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@") || !email.includes(".")) {
    return { ...initialState, status: "error", message: "Informe um e-mail válido." };
  }

  try {
    const invitation = await createOrganizationInvitation({
      organizationId: session.user.organizationId,
      invitedById: session.user.id,
      email,
    });
    revalidatePath("/configuracoes/usuarios");
    return {
      status: "success",
      message: `Convite criado para ${invitation.email}.`,
      token: invitation.token,
    };
  } catch (error) {
    const messages: Record<string, string> = {
      EMAIL_ALREADY_EXISTS: "Este e-mail já pertence a um usuário.",
      INVITE_ALREADY_EXISTS: "Já existe um convite pendente para este e-mail.",
    };
    return { ...initialState, status: "error", message: error instanceof Error ? messages[error.message] ?? "Não foi possível criar o convite." : "Não foi possível criar o convite." };
  }
}

export async function revokeInvitationAction(formData: FormData) {
  const session = await requireOrganizationOwnerContext();
  const invitationId = String(formData.get("invitationId") ?? "");
  if (!invitationId) return;
  try {
    await revokeOrganizationInvitation(session.user.organizationId, session.user.id, invitationId);
    revalidatePath("/configuracoes/usuarios");
  } catch {
    // The invitation may have been revoked by another request; the next render is authoritative.
    revalidatePath("/configuracoes/usuarios");
  }
}
