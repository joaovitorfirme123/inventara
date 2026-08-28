import type { Metadata } from "next";
import { EmptySection } from "@/components/empty-section";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Importações" };

export default function ImportacoesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Entrada de dados"
        title="Importações"
        description="Acompanhe os arquivos enviados e o resultado de cada processamento."
      />
      <EmptySection
        label="CSV"
        title="Nenhuma importação realizada"
        description="O envio e o histórico de arquivos serão adicionados nas fases específicas do roadmap."
      />
    </>
  );
}
