import type { ProductInventoryStatus } from "@/lib/inventory-status";
import type { ProductQuery, ProductSort } from "@/data/products";

const statuses: ProductInventoryStatus[] = ["contado", "pendente", "sem-data"];
const sorts: ProductSort[] = ["description", "lastInventory", "currentStock"];

function value(url: URL, key: string) {
  return url.searchParams.get(key)?.trim() ?? "";
}

function validYear(value: string) {
  const year = Number.parseInt(value, 10);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : undefined;
}

export function getProductExportFilters(url: URL, organizationId: string): Omit<ProductQuery, "page"> {
  const statusValue = value(url, "status");
  const sortValue = value(url, "sort");

  return {
    organizationId,
    query: value(url, "q") || undefined,
    section: value(url, "section") || undefined,
    group: value(url, "group") || undefined,
    subgroup: value(url, "subgroup") || undefined,
    status: statuses.includes(statusValue as ProductInventoryStatus)
      ? statusValue as ProductInventoryStatus
      : undefined,
    year: validYear(value(url, "year")),
    sort: sorts.includes(sortValue as ProductSort) ? sortValue as ProductSort : undefined,
  };
}

export function describeReportFilters(filters: Omit<ProductQuery, "page">) {
  return [
    filters.year ? `Ano: ${filters.year}` : "Ano: atual",
    filters.status ? `Status: ${filters.status}` : "Status: todos",
    filters.section ? `Seção: ${filters.section}` : null,
    filters.group ? `Grupo: ${filters.group}` : null,
    filters.subgroup ? `Subgrupo: ${filters.subgroup}` : null,
    filters.query ? `Busca: ${filters.query}` : null,
  ].filter((item): item is string => item !== null);
}
