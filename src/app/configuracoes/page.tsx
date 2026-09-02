import type { Metadata } from "next";
import Link from "next/link";
import { ClearOrganizationData } from "@/components/clear-organization-data";
import { PageHeader } from "@/components/page-header";
import { requireOrganizationOwnerContext } from "@/lib/session";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  await requireOrganizationOwnerContext();

  return (
    <>
      <PageHeader
        eyebrow="Preferências"
        title="Configurações"
        description="Gerencie as preferências do ambiente e da organização."
      />
      <section className="settings-links panel">
        <div>
          <span className="section-kicker">Acessos</span>
          <h2>Usuários da organização</h2>
          <p>Crie ou desative usuários com acesso ao ambiente atual.</p>
        </div>
        <Link className="secondary-action" href="/configuracoes/usuarios">Gerenciar usuários</Link>
      </section>
      <section className="settings-links panel">
        <div>
          <span className="section-kicker">Indicadores</span>
          <h2>Metas de inventário</h2>
          <p>Defina a cobertura anual desejada para cada seção.</p>
        </div>
        <Link className="secondary-action" href="/configuracoes/metas">Gerenciar metas</Link>
      </section>
      <ClearOrganizationData />
    </>
  );
}
