import {
  calculatePriorityScore,
  getPriority,
} from "@/lib/inventory-priority";
import type { InventoryPriority } from "@/lib/inventory-priority";
import { prisma } from "@/lib/prisma";
import { getInventoryYearBounds } from "@/lib/inventory-status";

type RawInventoryGroup = {
  section: string;
  group_name: string;
  subgroup: string;
  total_skus: number;
  counted_skus: number;
  pending_skus: number;
  no_date_skus: number;
  oldest_date: Date | null;
  newest_date: Date | null;
  oldest_pending_date: Date | null;
};

export type InventoryRow = {
  section: string;
  group: string;
  subgroup: string;
  totalSkus: number;
  countedSkus: number;
  pendingSkus: number;
  countedPercentage: number;
  noDateSkus: number;
  oldestDate: Date | null;
  newestDate: Date | null;
  oldestPendingDate: Date | null;
  score: number;
  priority: InventoryPriority;
  rank: number;
};

export type InventoryFilters = {
  section?: string;
  priority?: InventoryPriority;
  pendingOnly?: boolean;
  urgentOnly?: boolean;
  query?: string;
};

export type InventorySort = "priority" | "coverage" | "pending" | "name";

const comparators: Record<
  InventorySort,
  (left: InventoryRow, right: InventoryRow) => number
> = {
  priority: (left, right) =>
    right.score - left.score ||
    right.pendingSkus - left.pendingSkus ||
    left.group.localeCompare(right.group, "pt-BR") ||
    left.subgroup.localeCompare(right.subgroup, "pt-BR"),
  coverage: (left, right) =>
    left.countedPercentage - right.countedPercentage ||
    right.pendingSkus - left.pendingSkus ||
    right.score - left.score,
  pending: (left, right) =>
    right.pendingSkus - left.pendingSkus || right.score - left.score,
  name: (left, right) =>
    left.group.localeCompare(right.group, "pt-BR") ||
    left.subgroup.localeCompare(right.subgroup, "pt-BR"),
};

export async function getInventoryRows(
  organizationId: string,
  year = new Date().getFullYear(),
  now = new Date(),
  sort: InventorySort = "priority",
) {
  const { start, end } = getInventoryYearBounds(year);
  const groups = await prisma.$queryRaw<RawInventoryGroup[]>`
    SELECT
      COALESCE(NULLIF(BTRIM("section"), ''), 'Sem seção') AS "section",
      COALESCE(NULLIF(BTRIM("group"), ''), 'Sem grupo') AS "group_name",
      COALESCE(NULLIF(BTRIM("subgroup"), ''), 'Sem subgrupo') AS "subgroup",
      COUNT(*)::int AS "total_skus",
      COUNT(*) FILTER (
        WHERE "last_inventory" >= ${start}::date
          AND "last_inventory" < ${end}::date
      )::int AS "counted_skus",
      COUNT(*) FILTER (
        WHERE "last_inventory" IS NULL
          OR "last_inventory" < ${start}::date
          OR "last_inventory" >= ${end}::date
      )::int AS "pending_skus",
      COUNT(*) FILTER (WHERE "last_inventory" IS NULL)::int AS "no_date_skus",
      MIN("last_inventory") AS "oldest_date",
      MAX("last_inventory") AS "newest_date",
      MIN("last_inventory") FILTER (
        WHERE "last_inventory" IS NOT NULL
          AND (
            "last_inventory" < ${start}::date
            OR "last_inventory" >= ${end}::date
          )
      ) AS "oldest_pending_date"
    FROM "products"
    WHERE "organization_id" = ${organizationId}::uuid
    GROUP BY 1, 2, 3
  `;

  const rows = groups.map((group) => {
    const score = calculatePriorityScore(
      {
        totalSkus: group.total_skus,
        pendingSkus: group.pending_skus,
        noDateSkus: group.no_date_skus,
        oldestPendingDate: group.oldest_pending_date,
      },
      now,
    );

    return {
      section: group.section,
      group: group.group_name,
      subgroup: group.subgroup,
      totalSkus: group.total_skus,
      countedSkus: group.counted_skus,
      pendingSkus: group.pending_skus,
      countedPercentage:
        group.total_skus === 0
          ? 0
          : Math.round((group.counted_skus / group.total_skus) * 1000) / 10,
      noDateSkus: group.no_date_skus,
      oldestDate: group.oldest_date,
      newestDate: group.newest_date,
      oldestPendingDate: group.oldest_pending_date,
      score,
      priority: getPriority(score, group.pending_skus),
      rank: 0,
    } satisfies InventoryRow;
  });

  rows.sort(
    (left, right) =>
      left.section.localeCompare(right.section, "pt-BR") ||
      comparators.priority(left, right),
  );

  let currentSection = "";
  let rank = 0;
  for (const row of rows) {
    if (row.section !== currentSection) {
      currentSection = row.section;
      rank = 0;
    }
    row.rank = ++rank;
  }

  rows.sort(
    (left, right) =>
      left.section.localeCompare(right.section, "pt-BR") ||
      comparators[sort](left, right),
  );

  return rows;
}

export function filterInventoryRows(
  rows: InventoryRow[],
  filters: InventoryFilters,
) {
  const query = filters.query?.trim().toLowerCase() ?? "";

  return rows.filter(
    (row) =>
      (!filters.section || row.section === filters.section) &&
      (!filters.priority || row.priority === filters.priority) &&
      (!filters.urgentOnly || row.priority === "Urgente") &&
      (!filters.pendingOnly || row.pendingSkus > 0) &&
      (!query ||
        `${row.section} ${row.group} ${row.subgroup}`
          .toLowerCase()
          .includes(query)),
  );
}
