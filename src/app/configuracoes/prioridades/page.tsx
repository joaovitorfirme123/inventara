import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { PriorityRuleManager } from "@/components/priority-rule-manager";
import { getPriorityRuleSettings } from "@/data/priority-rules";
import { getCurrentOrganizationId } from "@/lib/current-organization";
import { requireOrganizationOwnerContext } from "@/lib/session";

export const metadata: Metadata = { title: "Regras de prioridade" };

export default async function PriorityRulesPage() {
  await requireOrganizationOwnerContext();
  const settings = await getPriorityRuleSettings(await getCurrentOrganizationId());
  return (
    <>
      <PageHeader
        eyebrow="Configuração operacional"
        title="Regras de prioridade"
        description="Ajuste pesos e faixas sem perder a explicação ou o histórico das pontuações."
      />
      <PriorityRuleManager settings={settings} />
    </>
  );
}
