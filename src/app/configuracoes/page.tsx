import type { Metadata } from "next";
import { ClearOrganizationData } from "@/components/clear-organization-data";
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
      <ClearOrganizationData />
    </>
  );
}
