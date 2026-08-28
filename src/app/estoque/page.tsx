import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ProductFilters } from "@/components/product-filters";
import { getProductFilterOptions } from "@/data/products";
import { listStockPositions, STOCK_PAGE_SIZE } from "@/data/stock";
import { getCurrentOrganizationId } from "@/lib/current-organization";

export const metadata: Metadata = { title: "Estoque" };

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
  params.set("page", String(page));
  return `/estoque?${params.toString()}`;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
});

const stockFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const variationFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

function StockSkeleton() {
  return (
    <div className="product-loading" aria-label="Carregando estoque">
      <div className="skeleton-block" />
      <div className="skeleton-table">
        {Array.from({ length: 5 }, (_, index) => (
          <div className="skeleton-row" key={index} />
        ))}
      </div>
    </div>
  );
}

function variationClass(variation: number | null) {
  if (variation === null || variation === 0) return "neutral";
  return variation > 0 ? "positive" : "negative";
}

type StockFiltersType = {
  q: string;
  section: string;
  group: string;
  subgroup: string;
};

async function StockContent({
  organizationId,
  filters,
  page,
}: {
  organizationId: string;
  filters: StockFiltersType;
  page: number;
}) {
  const [result, options] = await Promise.all([
    listStockPositions({
      organizationId,
      page,
      query: filters.q,
      section: filters.section,
      group: filters.group,
      subgroup: filters.subgroup,
    }),
    getProductFilterOptions(organizationId, filters),
  ]);

  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value),
  );
  const firstItem =
    result.total === 0 ? 0 : (result.page - 1) * STOCK_PAGE_SIZE + 1;
  const lastItem = Math.min(result.page * STOCK_PAGE_SIZE, result.total);

  return (
    <>
      <ProductFilters
        key={`${filters.q}:${filters.section}:${filters.group}:${filters.subgroup}`}
        filters={filters}
        options={options}
        clearHref="/estoque"
      />

      <section className="product-list panel">
        <div className="list-summary">
          <div>
            <span className="section-kicker">Posição atual</span>
            <h2>{result.total} produtos no recorte</h2>
          </div>
          <p>
            Exibindo {firstItem}–{lastItem} de {result.total}
          </p>
        </div>

        {result.rows.length > 0 ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>PLU / Código</th>
                  <th>Classificação</th>
                  <th>Último inventário</th>
                  <th className="numeric">Estoque atual</th>
                  <th className="numeric">Anterior</th>
                  <th className="numeric">Variação</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => {
                  const variation = row.variation === null ? null : Number(row.variation);

                  return (
                    <tr key={row.id}>
                      <td data-label="Produto">
                        <strong>
                          <Link className="product-detail-link" href={`/produtos/${encodeURIComponent(row.plu)}`}>
                            {row.description}
                          </Link>
                        </strong>
                        <small>{row.section ?? "Sem seção"}</small>
                      </td>
                      <td data-label="PLU / Código">
                        <span className="code-value">{row.plu}</span>
                      </td>
                      <td data-label="Classificação">
                        <span>{row.group ?? "—"}</span>
                        <small>{row.subgroup ?? "Sem subgrupo"}</small>
                      </td>
                      <td data-label="Último inventário">
                        {row.lastInventory
                          ? dateFormatter.format(row.lastInventory)
                          : "Sem data"}
                      </td>
                      <td className="numeric" data-label="Estoque atual">
                        {stockFormatter.format(Number(row.currentStock))}
                      </td>
                      <td className="numeric" data-label="Anterior">
                        {row.previousStock === null
                          ? "—"
                          : stockFormatter.format(Number(row.previousStock))}
                      </td>
                      <td className="numeric" data-label="Variação">
                        <span className={`stock-variation ${variationClass(variation)}`}>
                          {variation === null
                            ? "—"
                            : `${variation > 0 ? "+" : ""}${variationFormatter.format(variation)}`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="list-empty">
            <span>0</span>
            <div>
              <h3>Nenhum produto encontrado</h3>
              <p>Ajuste a busca ou limpe os filtros para tentar novamente.</p>
            </div>
          </div>
        )}

        <nav className="pagination" aria-label="Paginação de estoque">
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

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const rawPage = Number.parseInt(getParam(params.page), 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const filters = {
    q: getParam(params.q),
    section: getParam(params.section),
    group: getParam(params.group),
    subgroup: getParam(params.subgroup),
  };
  const organizationId = await getCurrentOrganizationId();

  return (
    <>
      <PageHeader
        eyebrow="Movimentação"
        title="Estoque"
        description="Consulte a posição atual e a evolução do estoque importado."
      />

      <Suspense fallback={<StockSkeleton />}>
        <StockContent
          organizationId={organizationId}
          filters={filters}
          page={page}
        />
      </Suspense>
    </>
  );
}
