"use client";

import { useActionState } from "react";
import {
  createOrganizationUserAction,
  deactivateOrganizationUserAction,
} from "@/app/configuracoes/usuarios/actions";
import type { UserAdminState } from "@/app/configuracoes/usuarios/types";

type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MEMBER" | "PLATFORM_ADMIN";
  isActive: boolean;
  createdAt: string;
};

const initialState: UserAdminState = { status: "idle", message: "" };

export function OrganizationUsers({ users }: { users: UserSummary[] }) {
  const [createState, createAction, isCreating] = useActionState(createOrganizationUserAction, initialState);
  const [deactivateState, deactivateAction, isDeactivating] = useActionState(deactivateOrganizationUserAction, initialState);
  const feedback = deactivateState.message ? deactivateState : createState;

  return (
    <div className="admin-grid">
      <section className="admin-form-panel panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Acessos</span><h2>Novo usuário</h2></div>
          <span className="status-pill">Member</span>
        </div>
        <p className="panel-intro">Novos usuários entram como member e só acessam os dados desta organização.</p>
        <form action={createAction} className="admin-form">
          <label><span>Nome</span><input name="name" required type="text" /></label>
          <label><span>E-mail</span><input autoComplete="email" name="email" required type="email" /></label>
          <label><span>Senha inicial</span><input autoComplete="new-password" minLength={8} name="password" required type="password" /></label>
          {createState.message && <p className={`action-feedback ${createState.status}`} role={createState.status === "error" ? "alert" : "status"}>{createState.message}</p>}
          <button disabled={isCreating} type="submit">{isCreating ? "Criando usuário..." : "Criar usuário"}</button>
        </form>
      </section>

      <section className="organization-list panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Organização atual</span><h2>Usuários</h2></div>
          <span className="status-pill">{users.length} acessos</span>
        </div>
        {feedback.message && <p className={`action-feedback ${feedback.status}`} role={feedback.status === "error" ? "alert" : "status"}>{feedback.message}</p>}
        <div className="organization-cards">
          {users.map((user) => (
            <article className="organization-card" key={user.id}>
              <div>
                <strong>{user.name}</strong>
                <small>{user.email} · criado em {user.createdAt}</small>
              </div>
              <div className="user-card-actions">
                <span className={`role-badge ${user.role.toLowerCase()}`}>{user.role.toLowerCase()}</span>
                {user.isActive && user.role === "MEMBER" ? (
                  <form action={deactivateAction}>
                    <input name="userId" type="hidden" value={user.id} />
                    <button disabled={isDeactivating} className="quiet-danger-button" type="submit">Desativar</button>
                  </form>
                ) : (
                  <span className="user-status">{user.isActive ? "Ativo" : "Inativo"}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
