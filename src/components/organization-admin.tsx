"use client";

import { useActionState } from "react";
import { createOrganizationAction } from "@/app/admin/organizacoes/actions";
import type { OrganizationAdminState } from "@/app/admin/organizacoes/types";

type OrganizationSummary = {
  id: string;
  name: string;
  createdAt: string;
  users: number;
  products: number;
};

const initialState: OrganizationAdminState = { status: "idle", message: "" };

export function OrganizationAdmin({ organizations }: { organizations: OrganizationSummary[] }) {
  const [state, formAction, isPending] = useActionState(createOrganizationAction, initialState);

  return (
    <div className="admin-grid">
      <section className="admin-form-panel panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Provisionamento</span>
            <h2>Nova organização</h2>
          </div>
          <span className="status-pill">Owner inicial</span>
        </div>
        <p className="panel-intro">
          Crie o tenant e o primeiro usuário administrador em uma única operação.
        </p>
        <form action={formAction} className="admin-form">
          <label>
            <span>Nome da organização</span>
            <input name="organizationName" required type="text" />
          </label>
          <label>
            <span>Nome do owner</span>
            <input name="ownerName" required type="text" />
          </label>
          <label>
            <span>E-mail do owner</span>
            <input autoComplete="email" name="ownerEmail" required type="email" />
          </label>
          <label>
            <span>Senha inicial</span>
            <input autoComplete="new-password" minLength={8} name="ownerPassword" required type="password" />
          </label>
          {state.message && (
            <p className={`action-feedback ${state.status}`} role={state.status === "error" ? "alert" : "status"}>
              {state.message}
            </p>
          )}
          <button disabled={isPending} type="submit">
            {isPending ? "Criando organização..." : "Criar organização"}
          </button>
        </form>
      </section>

      <section className="organization-list panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Plataforma</span>
            <h2>Organizações</h2>
          </div>
          <span className="status-pill">{organizations.length} tenants</span>
        </div>
        {organizations.length > 0 ? (
          <div className="organization-cards">
            {organizations.map((organization) => (
              <article className="organization-card" key={organization.id}>
                <div>
                  <strong>{organization.name}</strong>
                  <small>Criada em {organization.createdAt}</small>
                </div>
                <dl>
                  <div><dt>Usuários</dt><dd>{organization.users}</dd></div>
                  <div><dt>Produtos</dt><dd>{organization.products}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className="list-empty"><span>0</span><div><h3>Nenhuma organização</h3><p>Crie o primeiro tenant usando o formulário.</p></div></div>
        )}
      </section>
    </div>
  );
}
