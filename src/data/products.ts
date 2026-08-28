import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const PRODUCT_PAGE_SIZE = 10;

export type ProductQuery = {
  organizationId: string;
  page: number;
  query?: string;
  section?: string;
  group?: string;
  subgroup?: string;
};

function createProductWhere(filters: ProductQuery): Prisma.ProductWhereInput {
  return {
    organizationId: filters.organizationId,
    ...(filters.query && {
      OR: [
        { description: { contains: filters.query, mode: "insensitive" } },
        { plu: { contains: filters.query, mode: "insensitive" } },
        { barcode: { contains: filters.query, mode: "insensitive" } },
      ],
    }),
    ...(filters.section && { section: filters.section }),
    ...(filters.group && { group: filters.group }),
    ...(filters.subgroup && { subgroup: filters.subgroup }),
  };
}

export async function listProducts(filters: ProductQuery) {
  const where = createProductWhere(filters);
  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PRODUCT_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const products = await prisma.product.findMany({
    where,
    orderBy: [{ description: "asc" }, { id: "asc" }],
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

export async function getProductFilterOptions(
  organizationId: string,
  filters: Pick<ProductQuery, "section" | "group"> = {},
) {
  const where = { organizationId };
  const [sections, groups, subgroups] = await Promise.all([
    prisma.product.findMany({
      where: { ...where, section: { not: null } },
      distinct: ["section"],
      select: { section: true },
      orderBy: { section: "asc" },
    }),
    prisma.product.findMany({
      where: {
        ...where,
        group: { not: null },
        ...(filters.section && { section: filters.section }),
      },
      distinct: ["group"],
      select: { group: true },
      orderBy: { group: "asc" },
    }),
    prisma.product.findMany({
      where: {
        ...where,
        subgroup: { not: null },
        ...(filters.section && { section: filters.section }),
        ...(filters.group && { group: filters.group }),
      },
      distinct: ["subgroup"],
      select: { subgroup: true },
      orderBy: { subgroup: "asc" },
    }),
  ]);

  return {
    sections: sections.flatMap(({ section }) => (section ? [section] : [])),
    groups: groups.flatMap(({ group }) => (group ? [group] : [])),
    subgroups: subgroups.flatMap(({ subgroup }) =>
      subgroup ? [subgroup] : [],
    ),
  };
}
