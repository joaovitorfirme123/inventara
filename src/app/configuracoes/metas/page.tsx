import type { Metadata } from "next";
import { InventoryGoals } from "@/components/inventory-goals";
import { getInventoryRows } from "@/data/inventories";
import { listInventoryGoals } from "@/data/inventory-goals";
import { getCurrentOrganizationId } from "@/lib/current-organization";
import { requireOrganizationOwnerContext } from "@/lib/session";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Metas de inventário" };

export default async function InventoryGoalsPage() {
  await requireOrganizationOwnerContext();
  const year = new Date().getFullYear();
  const organizationId = await getCurrentOrganizationId();
  const [rows, goals] = await Promise.all([
    getInventoryRows(organizationId, year),
    listInventoryGoals(organizationId, year),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={`Ciclo ${year}`}
        title="Metas de inventário"
        description="Defina objetivos de cobertura por seção e acompanhe a evolução mensal."
      />
      <InventoryGoals
        goals={goals}
        sections={[...new Set(rows.map((row) => row.section))]}
        year={year}
      />
    </>
  );
}
