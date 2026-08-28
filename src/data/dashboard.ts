import { getInventoryRows } from "@/data/inventories";
import type { InventoryRow } from "@/data/inventories";
import { PRIORITIES } from "@/lib/inventory-priority";
import type { InventoryPriority } from "@/lib/inventory-priority";

export type DashboardSection = {
  section: string;
  totalSkus: number;
  countedSkus: number;
  pendingSkus: number;
  countedPercentage: number;
  urgentGroups: number;
  highPriorityGroups: number;
};

export type DashboardData = {
  summary: {
    totalSkus: number;
    totalSections: number;
    totalGroups: number;
    totalSubgroups: number;
    countedSkus: number;
    pendingSkus: number;
    countedPercentage: number;
    noDateSkus: number;
  };
  sections: DashboardSection[];
  priorities: Array<{
    priority: InventoryPriority;
    total: number;
  }>;
};

function percentage(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 1000) / 10;
}

export function buildDashboardData(rows: InventoryRow[]): DashboardData {
  const groups = new Set<string>();
  const sectionMap = new Map<string, Omit<DashboardSection, "countedPercentage">>();
  const priorityTotals = Object.fromEntries(
    PRIORITIES.map((priority) => [priority, 0]),
  ) as Record<InventoryPriority, number>;
  let totalSkus = 0;
  let countedSkus = 0;
  let pendingSkus = 0;
  let noDateSkus = 0;

  for (const row of rows) {
    totalSkus += row.totalSkus;
    countedSkus += row.countedSkus;
    pendingSkus += row.pendingSkus;
    noDateSkus += row.noDateSkus;
    groups.add(`${row.section}\u0000${row.group}`);
    priorityTotals[row.priority] += 1;

    const section = sectionMap.get(row.section) ?? {
      section: row.section,
      totalSkus: 0,
      countedSkus: 0,
      pendingSkus: 0,
      urgentGroups: 0,
      highPriorityGroups: 0,
    };
    section.totalSkus += row.totalSkus;
    section.countedSkus += row.countedSkus;
    section.pendingSkus += row.pendingSkus;
    if (row.priority === "Urgente") section.urgentGroups += 1;
    if (row.priority === "Alta") section.highPriorityGroups += 1;
    sectionMap.set(row.section, section);
  }

  const sections = Array.from(sectionMap.values())
    .map((section) => ({
      ...section,
      countedPercentage: percentage(section.countedSkus, section.totalSkus),
    }))
    .sort((left, right) => left.section.localeCompare(right.section, "pt-BR"));

  return {
    summary: {
      totalSkus,
      totalSections: sections.length,
      totalGroups: groups.size,
      totalSubgroups: rows.length,
      countedSkus,
      pendingSkus,
      countedPercentage: percentage(countedSkus, totalSkus),
      noDateSkus,
    },
    sections,
    priorities: PRIORITIES.map((priority) => ({
      priority,
      total: priorityTotals[priority],
    })),
  };
}

export async function getDashboardData(
  organizationId: string,
  year = new Date().getFullYear(),
  now = new Date(),
) {
  return buildDashboardData(await getInventoryRows(organizationId, year, now));
}
