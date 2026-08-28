import type { Metadata } from "next";
import { EmptySection } from "@/components/empty-section";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Configurações" };

export default function ConfiguracoesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Preferências"
        title="Configurações"
        description="Gerencie as preferências do ambiente e da organização."
      />
      <EmptySection
        label="CFG"
        title="Configuração padrão ativa"
        description="Novas opções serão incluídas somente quando as respectivas regras do sistema forem implementadas."
      />
    </>
  );
}
