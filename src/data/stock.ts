import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const STOCK_PAGE_SIZE = 10;

export type StockPositionQuery = {
  organizationId: string;
  page: number;
  query?: string;
  section?: string;
  group?: string;
  subgroup?: string;
};

export type StockPositionRow = {
  id: string;
  plu: string;
  description: string;
  section: string | null;
  group: string | null;
  subgroup: string | null;
  lastInventory: Date | null;
  currentStock: string;
  previousStock: string | null;
  variation: string | null;
};

function createStockWhere(filters: StockPositionQuery): Prisma.ProductWhereInput {
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

export async function listStockPositions(filters: StockPositionQuery) {
  const where = createStockWhere(filters);
  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / STOCK_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const products = await prisma.product.findMany({
    where,
    orderBy: [{ description: "asc" }, { id: "asc" }],
    skip: (page - 1) * STOCK_PAGE_SIZE,
    take: STOCK_PAGE_SIZE,
  });

  const snapshots = await prisma.stockHistory.findMany({
    where: {
      organizationId: filters.organizationId,
      productId: { in: products.map((product) => product.id) },
    },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    select: { productId: true, stock: true },
  });

  const latestByProduct = new Map<string, string[]>();
  for (const snapshot of snapshots) {
    const positions = latestByProduct.get(snapshot.productId) ?? [];
    if (positions.length < 2) positions.push(snapshot.stock.toString());
    latestByProduct.set(snapshot.productId, positions);
  }

  const rows: StockPositionRow[] = products.map((product) => {
    const [current, previous] = latestByProduct.get(product.id) ?? [];
    const currentStock = current ?? product.currentStock.toString();
    const previousStock = previous ?? null;
    const variation =
      previous === undefined
        ? null
        : product.currentStock.minus(new Prisma.Decimal(previous)).toString();

    return {
      id: product.id,
      plu: product.plu,
      description: product.description,
      section: product.section,
      group: product.group,
      subgroup: product.subgroup,
      lastInventory: product.lastInventory,
      currentStock,
      previousStock,
      variation,
    };
  });

  return { rows, total, page, totalPages };
}
