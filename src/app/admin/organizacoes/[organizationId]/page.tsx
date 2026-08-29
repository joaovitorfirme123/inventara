import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganizationAdminDetails } from "@/data/organization-admin";
import { getRolePermissions } from "@/lib/permissions";
import { requirePlatformAdminContext } from "@/lib/session";

export const metadata: Metadata = { title: "Detalhes da organização" };

export default async function OrganizationDetailsPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  await requirePlatformAdminContext();
  const { organizationId } = await params;
  const organization = await getOrganizationAdminDetails(organizationId);

  if (!organization) notFound();

  return (
    <>
      <header className="detail-page-header">
        <div>
          <Link className="back-link" href="/admin/organizacoes">← Voltar para organizações</Link>
          <span className="eyebrow">Inspeção administrativa</span>
          <h1>{organization.name}</h1>
          <p>Criada em {organization.createdAt}. Esta tela consulta permissões efetivas sem assumir a sessão de nenhum usuário.</p>
        </div>
      </header>

      <section className="admin-summary-grid">
        <article className="admin-summary-card panel"><span>Usuários</span><strong>{organization.usersCount}</strong></article>
        <article className="admin-summary-card panel"><span>Produtos</span><strong>{organization.productsCount}</strong></article>
        <article className="admin-summary-card panel"><span>Importações</span><strong>{organization.importsCount}</strong></article>
      </section>

      <section className="organization-users-detail panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Acessos cadastrados</span><h2>Usuários e permissões</h2></div>
          <span className="status-pill">{organization.users.length} usuários</span>
        </div>
        <div className="permission-user-list">
          {organization.users.map((user) => (
            <article className="permission-user-card" key={user.id}>
              <div className="permission-user-heading">
                <div>
                  <strong>{user.name}</strong>
                  <small>{user.email} · criado em {user.createdAt}</small>
                </div>
                <div className="user-card-actions">
                  <span className={`role-badge ${user.role.toLowerCase()}`}>{user.role.toLowerCase()}</span>
                  <span className={`user-status ${user.isActive ? "active" : "inactive"}`}>{user.isActive ? "Ativo" : "Inativo"}</span>
                </div>
              </div>
              <div className="permission-list">
                {getRolePermissions(user.role).map((permission) => <span key={permission}>{permission}</span>)}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
