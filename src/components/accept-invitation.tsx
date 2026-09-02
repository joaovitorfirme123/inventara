"use client";

import { useActionState } from "react";
import Link from "next/link";
import { acceptInvitationAction } from "@/app/convites/[token]/actions";
import type { InvitationActionState } from "@/app/configuracoes/usuarios/invitation-types";

const initialState: InvitationActionState = { status: "idle", message: "", token: null };

export function AcceptInvitation({ token, email }: { token: string; email: string }) {
  const [state, formAction, isPending] = useActionState(acceptInvitationAction, initialState);
  if (state.status === "success") return <section className="invite-accept panel"><span className="invite-accept-mark">OK</span><h2>Conta criada</h2><p>{state.message}</p><Link className="primary-action" href="/login">Ir para o login</Link></section>;

  return <section className="invite-accept panel"><div className="panel-heading"><div><span className="section-kicker">Convite de equipe</span><h2>Ativar acesso</h2></div></div><p>Este convite foi enviado para <strong>{email}</strong>. Defina seus dados para entrar como membro da organização.</p><form action={formAction} className="admin-form"><input name="token" type="hidden" value={token} /><label><span>Seu nome</span><input name="name" required type="text" /></label><label><span>Senha</span><input minLength={8} name="password" required type="password" /></label>{state.message && <p className="action-feedback error" role="alert">{state.message}</p>}<button disabled={isPending} type="submit">{isPending ? "Ativando..." : "Aceitar convite"}</button></form></section>;
}
