"use client";

import { useActionState } from "react";
import { createInvitationAction, revokeInvitationAction } from "@/app/configuracoes/usuarios/invitation-actions";
import type { InvitationActionState } from "@/app/configuracoes/usuarios/invitation-types";

type Invitation = {
  id: string;
  email: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

const initialState: InvitationActionState = { status: "idle", message: "", token: null };
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function invitationStatus(invitation: Invitation) {
  if (invitation.acceptedAt) return ["accepted", "Aceito"] as const;
  if (invitation.revokedAt) return ["revoked", "Revogado"] as const;
  if (new Date(invitation.expiresAt) <= new Date()) return ["expired", "Expirado"] as const;
  return ["pending", "Pendente"] as const;
}

export function OrganizationInvitations({ invitations }: { invitations: Invitation[] }) {
  const [state, formAction, isCreating] = useActionState(createInvitationAction, initialState);

  return (
    <section className="invitation-panel panel">
      <div className="panel-heading">
        <div><span className="section-kicker">Equipe</span><h2>Convites</h2></div>
        <span className="status-pill">{invitations.length} registros</span>
      </div>
      <form action={formAction} className="invitation-form">
        <label><span>E-mail do funcionário</span><input autoComplete="email" name="email" placeholder="pessoa@empresa.com" required type="email" /></label>
        <button disabled={isCreating} type="submit">{isCreating ? "Criando..." : "Gerar convite"}</button>
      </form>
      {state.message && <p className={`action-feedback ${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
      {state.token && <div className="invitation-created"><span>Link de convite</span><code>/convites/{state.token}</code><small>Envie este link ao funcionário. Ele será válido por 7 dias.</small></div>}
      {invitations.length > 0 && <div className="invitation-list">{invitations.map((invitation) => { const [statusClass, statusLabel] = invitationStatus(invitation); return <article className="invitation-row" key={invitation.id}><div><strong>{invitation.email}</strong><small>Criado em {dateFormatter.format(new Date(invitation.createdAt))} · expira em {dateFormatter.format(new Date(invitation.expiresAt))}</small></div><div className="invitation-row-actions"><span className={`invite-status ${statusClass}`}>{statusLabel}</span>{statusClass === "pending" && <form action={revokeInvitationAction}><input name="invitationId" type="hidden" value={invitation.id} /><button type="submit">Revogar</button></form>}</div></article>; })}</div>}
    </section>
  );
}
