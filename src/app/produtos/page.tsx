import type { Metadata } from "next";
import { EmptySection } from "@/components/empty-section";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Produtos" };

export default function ProdutosPage() {
  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Produtos"
        description="Consulte a base de produtos vinculada à sua organização."
      />
      <EmptySection
        label="PRD"
        title="Nenhum produto disponível"
        description="A listagem será habilitada quando a estrutura de produtos e o banco de dados forem implementados."
      />
    </>
  );
}
