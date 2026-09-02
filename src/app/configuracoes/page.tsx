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
          <span className="section-kicker">Rastreabilidade</span>
          <h2>Auditoria de acessos</h2>
          <p>Consulte alterações recentes de usuários e convites.</p>
        </div>
        <Link className="secondary-action" href="/configuracoes/auditoria">Consultar auditoria</Link>
      </section>
      <section className="settings-links panel">
        <div>
          <span className="section-kicker">Controle</span>
          <h2>Matriz de permissões</h2>
          <p>Consulte o acesso disponível para cada perfil da organização.</p>
        </div>
        <Link className="secondary-action" href="/configuracoes/permissoes">Consultar matriz</Link>
      </section>
      <section className="settings-links panel">
        <div>
          <span className="section-kicker">Indicadores</span>
          <h2>Metas de inventário</h2>
          <p>Defina a cobertura anual desejada para cada seção.</p>
        </div>
        <Link className="secondary-action" href="/configuracoes/metas">Gerenciar metas</Link>
      </section>
      <section className="settings-links panel">
        <div>
          <span className="section-kicker">Priorização</span>
          <h2>Regras de prioridade</h2>
          <p>Ajuste pesos e faixas da pontuação dos inventários.</p>
        </div>
        <Link className="secondary-action" href="/configuracoes/prioridades">Gerenciar regras</Link>
      </section>
      <ClearOrganizationData />
    </>
  );
}
