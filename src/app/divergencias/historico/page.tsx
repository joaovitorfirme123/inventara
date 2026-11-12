import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { DivergenciasHistorico } from "@/components/divergencias-historico";
import { getCurrentOrganizationId } from "@/lib/current-organization";

export const metadata: Metadata = { title: "Histórico de divergências" };

export default async function DivergenciasHistoricoPage() {
  await getCurrentOrganizationId();

  return (
    <>
      <PageHeader
        eyebrow="Análise de divergências"
        title="Histórico de análises"
        description="Análises salvas no banco do Inventara, disponíveis para toda a organização em qualquer aparelho. Compare inventários de datas diferentes para achar divergências recorrentes."
      />
<nav className="div-tabs" aria-label="Seções de divergências">
<Link href="/divergencias" className="div-tab">Análise</Link>
<Link href="/divergencias/historico" className="div-tab active" aria-current="page">Histórico e comparação</Link>
</nav>
      <DivergenciasHistorico />
    </>
  );
}
