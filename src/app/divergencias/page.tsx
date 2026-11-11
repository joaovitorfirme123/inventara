import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { DivergenciasAnalise } from "@/components/divergencias-analise";
import { getCurrentOrganizationId } from "@/lib/current-organization";

export const metadata: Metadata = { title: "Análise de divergências" };

export default async function DivergenciasPage() {
  await getCurrentOrganizationId();

  return (
    <>
      <PageHeader
        eyebrow="Análise de divergências"
        title="Divergências de inventário"
        description="Importe o relatório de divergências em CSV e confira padrões que merecem investigação. Os alertas são hipóteses com o que conferir, nunca provas de causa. O arquivo é lido só neste navegador; nada vai ao ERP, e ao banco do Inventara só vai a análise que você escolher salvar."
      />
      <DivergenciasAnalise />
    </>
  );
}
