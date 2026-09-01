import { prisma } from "@/lib/prisma";
import {
  getInventoryYearBounds,
  getProductInventoryStatusLabel,
  type ProductInventoryStatus,
} from "@/lib/inventory-status";

export async function getProductDetailsByPlu(
  organizationId: string,
  plu: string,
) {
  const product = await prisma.product.findUnique({
    where: { organizationId_plu: { organizationId, plu } },
    select: {
      id: true,
      plu: true,
      barcode: true,
      description: true,
      section: true,
      group: true,
      subgroup: true,
      lastInventory: true,
      currentStock: true,
      stockHistory: {
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          stock: true,
          recordedAt: true,
          importRecord: {
            select: { id: true, filename: true, importedAt: true },
          },
        },
      },
    },
  });

  if (!product) return null;

  const previousStock = product.stockHistory[1]?.stock ?? null;

  return {
    id: product.id,
    plu: product.plu,
    barcode: product.barcode,
    description: product.description,
    section: product.section,
    group: product.group,
    subgroup: product.subgroup,
    lastInventory: product.lastInventory,
    currentStock: product.currentStock.toString(),
    previousStock: previousStock?.toString() ?? null,
    variation: previousStock
      ? product.currentStock.minus(previousStock).toString()
      : null,
    history: product.stockHistory.map((snapshot) => ({
      id: snapshot.id,
      stock: snapshot.stock.toString(),
      recordedAt: snapshot.recordedAt,
      importId: snapshot.importRecord.id,
      filename: snapshot.importRecord.filename,
      importedAt: snapshot.importRecord.importedAt,
    })),
  };
}

export async function getQuickProductDetailsByPlu(
  organizationId: string,
  plu: string,
) {
  const product = await prisma.product.findUnique({
    where: { organizationId_plu: { organizationId, plu } },
    select: {
      plu: true,
      barcode: true,
      description: true,
      section: true,
      group: true,
      subgroup: true,
      lastInventory: true,
      currentStock: true,
      stockHistory: {
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
        take: 2,
        select: { stock: true },
      },
    },
  });

  if (!product) return null;

  const { start, end } = getInventoryYearBounds();
  const status: ProductInventoryStatus = !product.lastInventory
    ? "sem-data"
    : product.lastInventory >= start && product.lastInventory < end
      ? "contado"
      : "pendente";
  const previousStock = product.stockHistory[1]?.stock ?? null;

  return {
    plu: product.plu,
    barcode: product.barcode,
    description: product.description,
    section: product.section,
    group: product.group,
    subgroup: product.subgroup,
    currentStock: product.currentStock.toString(),
    previousStock: previousStock?.toString() ?? null,
    variation: previousStock
      ? product.currentStock.minus(previousStock).toString()
      : null,
    lastInventory: product.lastInventory?.toISOString() ?? null,
    status,
    statusLabel: getProductInventoryStatusLabel(status),
  };
}

export async function getProductStockPosition(
  organizationId: string,
  productId: string,
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId },
    select: {
      currentStock: true,
      stockHistory: {
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
        take: 2,
        select: { stock: true },
      },
    },
  });

  if (!product) return null;

  const currentStock = product.stockHistory[0]?.stock ?? product.currentStock;
  const previousStock = product.stockHistory[1]?.stock ?? null;

  return {
    currentStock: currentStock.toString(),
    previousStock: previousStock?.toString() ?? null,
    variation: previousStock ? currentStock.minus(previousStock).toString() : null,
  };
}
