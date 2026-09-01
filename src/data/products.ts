import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getInventoryYearBounds,
  type ProductInventoryStatus,
} from "@/lib/inventory-status";

export const PRODUCT_PAGE_SIZE = 10;
export const DEFAULT_PRODUCT_SORT = "description" as const;
export type ProductSort = "description" | "lastInventory" | "currentStock";

type ProductClassificationField = "section" | "group" | "subgroup";

const emptyClassificationLabels: Record<ProductClassificationField, string> = {
  section: "Sem seção",
  group: "Sem grupo",
  subgroup: "Sem subgrupo",
};

export type ProductQuery = {
  organizationId: string;
  page: number;
  query?: string;
  section?: string;
  group?: string;
  subgroup?: string;
  status?: ProductInventoryStatus;
  year?: number;
  sort?: ProductSort;
};

function createClassificationWhere(
  field: ProductClassificationField,
  value?: string,
): Prisma.ProductWhereInput {
  if (!value) return {};
  if (value === emptyClassificationLabels[field]) {
    return { OR: [{ [field]: null }, { [field]: "" }] };
  }
  return { [field]: value };
}

function createClassificationConditions(
  filters: Pick<ProductQuery, "section" | "group" | "subgroup">,
) {
  return (["section", "group", "subgroup"] as const)
    .map((field) => createClassificationWhere(field, filters[field]))
    .filter((condition) => Object.keys(condition).length > 0);
}

function createProductWhere(filters: ProductQuery): Prisma.ProductWhereInput {
  const { start, end } = getInventoryYearBounds(filters.year);
  const conditions: Prisma.ProductWhereInput[] = [];
  const inventoryStatus = filters.status === "contado"
    ? { lastInventory: { gte: start, lt: end } }
    : filters.status === "pendente"
      ? {
          OR: [
            { lastInventory: null },
            { lastInventory: { lt: start } },
            { lastInventory: { gte: end } },
          ],
        }
      : filters.status === "sem-data"
        ? { lastInventory: null }
        : {};
  if (Object.keys(inventoryStatus).length > 0) conditions.push(inventoryStatus);
  if (filters.query) {
    conditions.push({
      OR: [
        { description: { contains: filters.query, mode: "insensitive" } },
        { plu: { contains: filters.query, mode: "insensitive" } },
        { barcode: { contains: filters.query, mode: "insensitive" } },
      ],
    });
  }
  conditions.push(...createClassificationConditions(filters));

  return {
    organizationId: filters.organizationId,
    ...(conditions.length > 0 && { AND: conditions }),
  };
}

export async function listProducts(filters: ProductQuery) {
  const where = createProductWhere(filters);
  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PRODUCT_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const products = await prisma.product.findMany({
    where,
    orderBy:
      filters.sort === "lastInventory"
        ? [{ lastInventory: "desc" }, { description: "asc" }, { id: "asc" }]
        : filters.sort === "currentStock"
          ? [{ currentStock: "desc" }, { description: "asc" }, { id: "asc" }]
          : [{ description: "asc" }, { id: "asc" }],
    skip: (page - 1) * PRODUCT_PAGE_SIZE,
    take: PRODUCT_PAGE_SIZE,
  });

  return {
    products,
    total,
    page,
    totalPages,
  };
}

export function listProductsForExport(organizationId: string) {
  return prisma.product.findMany({
    where: { organizationId },
    orderBy: [{ plu: "asc" }, { id: "asc" }],
    select: {
      plu: true,
      barcode: true,
      description: true,
      section: true,
      group: true,
      subgroup: true,
      lastInventory: true,
      currentStock: true,
    },
  });
}

export async function getProductFilterOptions(
  organizationId: string,
  filters: Pick<ProductQuery, "section" | "group"> = {},
) {
  const where = { organizationId };
  const [sections, groups, subgroups] = await Promise.all([
    prisma.product.findMany({
      where,
      distinct: ["section"],
      select: { section: true },
      orderBy: { section: "asc" },
    }),
    prisma.product.findMany({
      where: {
        ...where,
        ...(createClassificationConditions(filters).length > 0 && {
          AND: createClassificationConditions(filters),
        }),
      },
      distinct: ["group"],
      select: { group: true },
      orderBy: { group: "asc" },
    }),
    prisma.product.findMany({
      where: {
        ...where,
        ...(createClassificationConditions(filters).length > 0 && {
          AND: createClassificationConditions(filters),
        }),
      },
      distinct: ["subgroup"],
      select: { subgroup: true },
      orderBy: { subgroup: "asc" },
    }),
  ]);

  return {
    sections: Array.from(
      new Set(sections.map(({ section }) => section?.trim() || emptyClassificationLabels.section)),
    ),
    groups: Array.from(
      new Set(groups.map(({ group }) => group?.trim() || emptyClassificationLabels.group)),
    ),
    subgroups: Array.from(
      new Set(subgroups.map(({ subgroup }) => subgroup?.trim() || emptyClassificationLabels.subgroup)),
    ),
  };
}
