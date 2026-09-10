import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ProductTable } from "@/components/product-table";
import type { ProductTableItem } from "@/components/product-table";
import { ProductFilters } from "@/components/product-filters";
import {
  DEFAULT_PRODUCT_SORT,
  getProductFilterOptions,
  listProducts,
  PRODUCT_PAGE_SIZE,
} from "@/data/products";
import type { ProductSort } from "@/data/products";
import { getCurrentOrganizationId } from "@/lib/current-organization";
import {
  getProductInventoryStatusLabel,
  isProductInventoryStatus,
  PRODUCT_INVENTORY_STATUSES,
} from "@/lib/inventory-status";
import type { ProductInventoryStatus } from "@/lib/inventory-status";

export const metadata: Metadata = { title: "Produtos" };

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

function getParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function createPageUrl(
  filters: Record<string, string>,
  page: number,
) {
  const params = new URLSearchParams(filters);
  if (page > 1) params.set("page", String(page));
  else params.delete("page");
  const query = params.toString();
  return query ? `/produtos?${query}` : "/produtos";
}

const sortOptions: Array<{ value: ProductSort; label: string }> = [
  { value: "description", label: "Descrição" },
  { value: "lastInventory", label: "Último inventário" },
  { value: "currentStock", label: "Maior estoque" },
];

function isProductSort(value: string): value is ProductSort {
  return sortOptions.some((option) => option.value === value);
}

function ProductsSkeleton() {
  return (
    <div className="product-loading" aria-label="Carregando produtos">
      <div className="skeleton-block" />
      <div className="skeleton-table">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="skeleton-row" key={index} />
        ))}
      </div>
    </div>
  );
}

type ProductFiltersType = {
  q: string;
  section: string;
  group: string;
  subgroup: string;
  status?: ProductInventoryStatus;
  sort?: ProductSort;
};

type ProductFilterOptions = Awaited<ReturnType<typeof getProductFilterOptions>>;

async function resolveProductFilters(
  organizationId: string,
  requested: ProductFiltersType,
) {
  const allOptions = await getProductFilterOptions(organizationId);
  const sectionIsValid =
    !requested.section || allOptions.sections.includes(requested.section);
  const section = sectionIsValid ? requested.section : "";
  const sectionOptions = section
    ? await getProductFilterOptions(organizationId, { section })
    : allOptions;
  const groupIsValid =
    sectionIsValid &&
    (!requested.group || sectionOptions.groups.includes(requested.group));
  const group = groupIsValid ? requested.group : "";
  const finalOptions = section || group
    ? await getProductFilterOptions(organizationId, { section, group })
    : sectionOptions;
  const subgroup =
    groupIsValid &&
    (!requested.subgroup || finalOptions.subgroups.includes(requested.subgroup))
      ? requested.subgroup
      : "";

  return {
    filters: { ...requested, section, group, subgroup },
    options: finalOptions,
  } satisfies { filters: ProductFiltersType; options: ProductFilterOptions };
}

function createProductsCanonicalUrl(filters: ProductFiltersType, page: number) {
  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value),
  );
  return createPageUrl(activeFilters, page);
}

function createProductsBreadcrumbs(filters: ProductFiltersType, year: number) {
  const items: Array<{ label: string; href?: string; current?: boolean }> = [
    { label: "Produtos", href: "/produtos" },
  ];
  const selected: Record<string, string> = {};

  for (const [field, value] of [
    ["section", filters.section],
    ["group", filters.group],
    ["subgroup", filters.subgroup],
  ] as const) {
    if (!value) continue;
    selected[field] = value;
    items.push({ label: value, href: createPageUrl(selected, 1) });
  }

  if (filters.status) {
    items.push({
      label: getProductInventoryStatusLabel(filters.status, year),
      current: true,
    });
  } else if (items.length > 1) {
    items[items.length - 1].current = true;
  }

  return items.length > 1 ? items : null;
}

async function ProductsContent({
  organizationId,
  filters,
  page,
  year,
  options,
}: {
  organizationId: string;
  filters: ProductFiltersType;
  page: number;
  year: number;
  options: ProductFilterOptions;
}) {
  const result = await listProducts({
    organizationId,
    page,
    query: filters.q,
    section: filters.section,
    group: filters.group,
    subgroup: filters.subgroup,
    status: filters.status,
    year,
    sort: filters.sort,
  });

  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value),
  );
  const firstItem =
    result.total === 0 ? 0 : (result.page - 1) * PRODUCT_PAGE_SIZE + 1;
  const lastItem = Math.min(result.page * PRODUCT_PAGE_SIZE, result.total);
  const statusLabel = filters.status
    ? getProductInventoryStatusLabel(filters.status, year)
    : null;
  const filtersWithoutStatus = Object.fromEntries(
    Object.entries(activeFilters).filter(([key]) => key !== "status"),
  );
  const removeStatusHref = createPageUrl(filtersWithoutStatus, 1);
  const breadcrumbs = createProductsBreadcrumbs(filters, year);

  return (
    <>
      {breadcrumbs ? (
        <nav className="product-breadcrumbs" aria-label="Breadcrumb">
          <ol>
            {breadcrumbs.map((item) => (
              <li key={item.label}>
                {item.href ? (
                  <Link
                    href={item.href}
                    aria-current={item.current ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={item.current ? "page" : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <ProductFilters
        key={`${filters.q}:${filters.section}:${filters.group}:${filters.subgroup}:${filters.status ?? ""}:${filters.sort ?? ""}`}
        filters={filters}
        options={options}
        statusOptions={PRODUCT_INVENTORY_STATUSES.map((status) => ({
          value: status,
          label: getProductInventoryStatusLabel(status, year),
        }))}
        sortOptions={sortOptions}
      />

      <section className="product-list panel">
        <div className="list-summary">
          <div>
            <span className="section-kicker">Base atual</span>
            <h2>{result.total} produtos encontrados</h2>
          </div>
          <div className="list-summary-meta">
            {statusLabel ? (
              <div className="active-product-filter" aria-label={`Filtro ativo: ${statusLabel}`}>
                <span>Filtro ativo</span>
                <strong>{statusLabel}</strong>
                <Link href={removeStatusHref}>Remover</Link>
              </div>
            ) : null}
            <p>
              Exibindo {firstItem}–{lastItem} de {result.total}
            </p>
          </div>
        </div>

        {result.products.length > 0 ? (
          <ProductTable
            products={result.products.map((product): ProductTableItem => ({
              id: product.id,
              plu: product.plu,
              barcode: product.barcode,
              description: product.description,
              section: product.section,
              group: product.group,
              subgroup: product.subgroup,
              lastInventory: product.lastInventory?.toISOString() ?? null,
              currentStock: product.currentStock.toString(),
            }))}
          />
        ) : (
          <div className="list-empty">
            <span>0</span>
            <div>
              <h3>Nenhum produto encontrado</h3>
              <p>Ajuste a busca ou limpe os filtros para tentar novamente.</p>
              <div className="empty-actions">
                {Object.keys(activeFilters).length > 0 ? (
                  <Link className="secondary-action" href="/produtos">Limpar filtros</Link>
                ) : (
                  <Link className="primary-action" href="/importacoes">Importar CSV</Link>
                )}
              </div>
            </div>
          </div>
        )}

        <nav className="pagination" aria-label="Paginação de produtos">
          {result.page > 1 ? (
            <Link href={createPageUrl(activeFilters, result.page - 1)}>
              Anterior
            </Link>
          ) : (
            <span aria-disabled="true">Anterior</span>
          )}
          <p>
            Página <strong>{result.page}</strong> de {result.totalPages}
          </p>
          {result.page < result.totalPages ? (
            <Link href={createPageUrl(activeFilters, result.page + 1)}>
              Próxima
            </Link>
          ) : (
            <span aria-disabled="true">Próxima</span>
          )}
        </nav>
      </section>
    </>
  );
}

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawPage = Number.parseInt(getParam(params.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const statusParam = getParam(params.status);
  const status = isProductInventoryStatus(statusParam) ? statusParam : undefined;
  const sortParam = getParam(params.sort);
  const sort = isProductSort(sortParam) && sortParam !== DEFAULT_PRODUCT_SORT
    ? sortParam
    : undefined;
  const filters = {
    q: getParam(params.q),
    section: getParam(params.section),
    group: getParam(params.group),
    subgroup: getParam(params.subgroup),
    status,
    sort,
  };
  const organizationId = await getCurrentOrganizationId();
  const { filters: resolvedFilters, options } = await resolveProductFilters(
    organizationId,
    filters,
  );
  const year = new Date().getFullYear();
  const canonicalUrl = createProductsCanonicalUrl(resolvedFilters, page);
  const currentParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) currentParams.append(key, item);
    }
  }
  const currentUrl = currentParams.toString()
    ? `/produtos?${currentParams.toString()}`
    : "/produtos";
  if (canonicalUrl !== currentUrl) redirect(canonicalUrl);

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Produtos"
        description="Consulte a base de produtos vinculada à sua organização."
      />

      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsContent
          organizationId={organizationId}
          filters={resolvedFilters}
          page={page}
          year={year}
          options={options}
        />
      </Suspense>
    </>
  );
}
