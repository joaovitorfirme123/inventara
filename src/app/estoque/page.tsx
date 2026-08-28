import type { Metadata } from "next";
import { EmptySection } from "@/components/empty-section";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Estoque" };

export default function EstoquePage() {
  return (
    <>
      <PageHeader
        eyebrow="Movimentação"
        title="Estoque"
        description="Consulte a posição atual e a evolução do estoque importado."
      />
      <EmptySection
        label="STK"
        title="Histórico ainda indisponível"
        description="As posições de estoque aparecerão aqui após a implementação dos snapshots de importação."
      />
    </>
  );
}
