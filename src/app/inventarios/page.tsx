import type { Metadata } from "next";
import { EmptySection } from "@/components/empty-section";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Inventários" };

export default function InventariosPage() {
  return (
    <>
      <PageHeader
        eyebrow="Planejamento"
        title="Inventários"
        description="Visualize grupos, cobertura e prioridades de contagem."
      />
      <EmptySection
        label="INV"
        title="Prioridades ainda não calculadas"
        description="Esta área receberá o ranking de inventários depois que o motor de priorização estiver disponível."
      />
    </>
  );
}
