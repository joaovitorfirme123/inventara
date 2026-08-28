import { prisma } from "@/lib/prisma";

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
