import { getInventoryRows } from "@/data/inventories";
import type { InventoryRow } from "@/data/inventories";
import { getInventoryCoverageHistory } from "@/data/inventory-coverage";
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
  recommendations: DashboardRecommendation[];
  coverageHistory: Awaited<ReturnType<typeof getInventoryCoverageHistory>>;
};

export type DashboardRecommendation = Pick<
  InventoryRow,
  | "section"
  | "group"
  | "subgroup"
  | "totalSkus"
  | "pendingSkus"
  | "countedPercentage"
  | "score"
  | "priority"
>;

type RecommendationCandidate = DashboardRecommendation & {
  groupKey: string;
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
    recommendations: [],
    coverageHistory: [],
  };
}

export function selectDashboardRecommendations(
  candidates: RecommendationCandidate[],
  limit = 6,
) {
  const selected: RecommendationCandidate[] = [];
  const usedGroups = new Set<string>();

  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (usedGroups.has(candidate.groupKey)) continue;
    selected.push(candidate);
    usedGroups.add(candidate.groupKey);
  }

  if (selected.length < limit) {
    for (const candidate of candidates) {
      if (selected.length >= limit) break;
      if (
        selected.some(
          (item) =>
            item.section === candidate.section &&
            item.group === candidate.group &&
            item.subgroup === candidate.subgroup,
        )
      ) continue;
      selected.push(candidate);
    }
  }

  return selected;
}

export function getDashboardRecommendations(
  rows: InventoryRow[],
) {
  const candidates = rows
    .filter((row) => row.pendingSkus > 0)
    .map((row) => ({
      ...row,
      groupKey: `${row.section}\u0000${row.group}`,
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.pendingSkus - left.pendingSkus ||
        left.countedPercentage - right.countedPercentage ||
        left.section.localeCompare(right.section, "pt-BR") ||
        left.group.localeCompare(right.group, "pt-BR") ||
        left.subgroup.localeCompare(right.subgroup, "pt-BR"),
    );

  return selectDashboardRecommendations(candidates).map((row) => ({
    section: row.section,
    group: row.group,
    subgroup: row.subgroup,
    totalSkus: row.totalSkus,
    pendingSkus: row.pendingSkus,
    countedPercentage: row.countedPercentage,
    score: row.score,
    priority: row.priority,
  }));
}

export async function getDashboardData(
  organizationId: string,
  year = new Date().getFullYear(),
  now = new Date(),
) {
  const rows = await getInventoryRows(organizationId, year, now);
  return {
    ...buildDashboardData(rows),
    recommendations: getDashboardRecommendations(rows),
    coverageHistory: await getInventoryCoverageHistory(organizationId, year),
  };
}
