import { getInventoryRows } from "@/data/inventories";
import type { InventoryRow } from "@/data/inventories";
import { PRIORITIES } from "@/lib/inventory-priority";
import type { InventoryPriority } from "@/lib/inventory-priority";
import { getInventoryYearBounds } from "@/lib/inventory-status";
import { prisma } from "@/lib/prisma";

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
};

export type DashboardRecommendation = {
  id: string;
  plu: string;
  description: string;
  section: string | null;
  group: string | null;
  subgroup: string | null;
  currentStock: string;
  lastInventory: string | null;
  priority: InventoryPriority;
  priorityScore: number;
};

type RecommendationCandidate = DashboardRecommendation & {
  groupKey: string;
  lastInventoryTime: number | null;
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
      if (selected.some((item) => item.id === candidate.id)) continue;
      selected.push(candidate);
    }
  }

  return selected;
}

export async function getDashboardRecommendations(
  organizationId: string,
  year: number,
  rows: InventoryRow[],
) {
  const { start, end } = getInventoryYearBounds(year);
  const products = await prisma.product.findMany({
    where: {
      organizationId,
      OR: [
        { lastInventory: null },
        { lastInventory: { lt: start } },
        { lastInventory: { gte: end } },
      ],
    },
    select: {
      id: true,
      plu: true,
      description: true,
      section: true,
      group: true,
      subgroup: true,
      currentStock: true,
      lastInventory: true,
    },
  });
  const priorityByGroup = new Map(
    rows.map((row) => [
      `${row.section}\u0000${row.group}\u0000${row.subgroup}`,
      row,
    ]),
  );
  const candidates = products
    .map((product) => {
      const groupKey = `${product.section?.trim() || "Sem seção"}\u0000${product.group?.trim() || "Sem grupo"}\u0000${product.subgroup?.trim() || "Sem subgrupo"}`;
      const priorityRow = priorityByGroup.get(groupKey);
      if (!priorityRow) return null;
      return {
        id: product.id,
        plu: product.plu,
        description: product.description,
        section: product.section,
        group: product.group,
        subgroup: product.subgroup,
        currentStock: product.currentStock.toString(),
        lastInventory: product.lastInventory?.toISOString() ?? null,
        priority: priorityRow.priority,
        priorityScore: priorityRow.score,
        groupKey: `${product.section?.trim() || "Sem seção"}\u0000${product.group?.trim() || "Sem grupo"}`,
        lastInventoryTime: product.lastInventory?.getTime() ?? null,
      } satisfies RecommendationCandidate;
    })
    .filter((candidate): candidate is RecommendationCandidate => candidate !== null)
    .sort(
      (left, right) =>
        right.priorityScore - left.priorityScore ||
        (left.lastInventoryTime ?? Number.NEGATIVE_INFINITY) -
          (right.lastInventoryTime ?? Number.NEGATIVE_INFINITY) ||
        left.description.localeCompare(right.description, "pt-BR") ||
        left.id.localeCompare(right.id),
    );

  return selectDashboardRecommendations(candidates).map((candidate) => ({
    id: candidate.id,
    plu: candidate.plu,
    description: candidate.description,
    section: candidate.section,
    group: candidate.group,
    subgroup: candidate.subgroup,
    currentStock: candidate.currentStock,
    lastInventory: candidate.lastInventory,
    priority: candidate.priority,
    priorityScore: candidate.priorityScore,
  }));
}

export async function getDashboardData(
  organizationId: string,
  year = new Date().getFullYear(),
  now = new Date(),
) {
  const rows = await getInventoryRows(organizationId, year, now);
  const [dashboard, recommendations] = await Promise.all([
    Promise.resolve(buildDashboardData(rows)),
    getDashboardRecommendations(organizationId, year, rows),
  ]);
  return { ...dashboard, recommendations };
}
