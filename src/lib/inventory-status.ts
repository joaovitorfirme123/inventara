export const PRODUCT_INVENTORY_STATUSES = [
  "contado",
  "pendente",
  "sem-data",
] as const;

export type ProductInventoryStatus = (typeof PRODUCT_INVENTORY_STATUSES)[number];

export function isProductInventoryStatus(
  value: string,
): value is ProductInventoryStatus {
  return PRODUCT_INVENTORY_STATUSES.some((status) => status === value);
}

export function getInventoryYearBounds(year = new Date().getFullYear()) {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

export function getProductInventoryStatusLabel(
  status: ProductInventoryStatus,
  year = new Date().getFullYear(),
) {
  switch (status) {
    case "contado":
      return `Contados em ${year}`;
    case "pendente":
      return "Pendentes";
    case "sem-data":
      return "Sem data";
  }
}
