import { prisma } from "@/lib/prisma";

export async function clearOrganizationData(organizationId: string) {
  return prisma.$transaction(async (transaction) => {
    const inventoryPlans = await transaction.inventoryPlan.deleteMany({
      where: { organizationId },
    });
    const inventoryCoverage = await transaction.inventoryCoverage.deleteMany({
      where: { organizationId },
    });
    const inventoryGoals = await transaction.inventoryGoal.deleteMany({
      where: { organizationId },
    });
    const stockHistory = await transaction.stockHistory.deleteMany({
      where: { organizationId },
    });
    const imports = await transaction.importRecord.deleteMany({
      where: { organizationId },
    });
    const products = await transaction.product.deleteMany({
      where: { organizationId },
    });

    return {
      products: products.count,
      imports: imports.count,
      stockHistory: stockHistory.count,
      inventoryPlans: inventoryPlans.count,
      inventoryCoverage: inventoryCoverage.count,
      inventoryGoals: inventoryGoals.count,
    };
  });
}
