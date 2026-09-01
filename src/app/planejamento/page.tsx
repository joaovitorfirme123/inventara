import type { Metadata } from "next";
import { InventoryPlanner } from "@/components/inventory-planner";
import { getInventoryRows } from "@/data/inventories";
import { listInventoryPlans } from "@/data/inventory-plans";
import { getCurrentOrganizationId } from "@/lib/current-organization";

export const metadata: Metadata = { title: "Planejamento" };

export default async function PlanejamentoPage() {
  const organizationId = await getCurrentOrganizationId();
  const [targets, plans] = await Promise.all([
    getInventoryRows(organizationId),
    listInventoryPlans(organizationId),
  ]);

  return (
    <>
      <header className="page-header">
        <div>
          <span className="eyebrow">Execução</span>
          <h1>Planejamento</h1>
        </div>
        <p>Transforme os recortes priorizados em tarefas de contagem com data, responsável e status.</p>
      </header>
      <InventoryPlanner
        initialPlans={plans}
        targets={targets.map((row) => ({
          section: row.section,
          group: row.group,
          subgroup: row.subgroup,
          priority: row.priority,
          totalSkus: row.totalSkus,
          pendingSkus: row.pendingSkus,
        }))}
      />
    </>
  );
}
