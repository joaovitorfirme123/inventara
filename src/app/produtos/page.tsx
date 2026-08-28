import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { ProductFilters } from "@/components/product-filters";
import {
  getProductFilterOptions,
  listProducts,
  PRODUCT_PAGE_SIZE,
} from "@/data/products";
import { getCurrentOrganizationId } from "@/lib/current-organization";

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
  params.set("page", String(page));
  return `/produtos?${params.toString()}`;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
});

const stockFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

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
};

async function ProductsContent({
  organizationId,
  filters,
  page,
}: {
  organizationId: string;
  filters: ProductFiltersType;
  page: number;
}) {
  const [result, options] = await Promise.all([
    listProducts({
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
    result.total === 0 ? 0 : (result.page - 1) * PRODUCT_PAGE_SIZE + 1;
  const lastItem = Math.min(result.page * PRODUCT_PAGE_SIZE, result.total);

  return (
    <>
      <ProductFilters
        key={`${filters.q}:${filters.section}:${filters.group}:${filters.subgroup}`}
        filters={filters}
        options={options}
      />

      <section className="product-list panel">
        <div className="list-summary">
          <div>
            <span className="section-kicker">Base atual</span>
            <h2>{result.total} produtos encontrados</h2>
          </div>
          <p>
            Exibindo {firstItem}–{lastItem} de {result.total}
          </p>
        </div>

        {result.products.length > 0 ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>PLU / Código</th>
                  <th>Classificação</th>
                  <th>Último inventário</th>
                  <th className="numeric">Estoque</th>
                </tr>
              </thead>
              <tbody>
                {result.products.map((product) => (
                  <tr key={product.id}>
                    <td data-label="Produto">
                      <strong>
                        <Link className="product-detail-link" href={`/produtos/${encodeURIComponent(product.plu)}`}>
                          {product.description}
                        </Link>
                      </strong>
                      <small>{product.section ?? "Sem seção"}</small>
                    </td>
                    <td data-label="PLU / Código">
                      <span className="code-value">{product.plu}</span>
                      <small>{product.barcode ?? "Sem código"}</small>
                    </td>
                    <td data-label="Classificação">
                      <span>{product.group ?? "—"}</span>
                      <small>{product.subgroup ?? "Sem subgrupo"}</small>
                    </td>
                    <td data-label="Último inventário">
                      {product.lastInventory
                        ? dateFormatter.format(product.lastInventory)
                        : "Sem data"}
                    </td>
                    <td className="numeric" data-label="Estoque">
                      {stockFormatter.format(Number(product.currentStock))}
                    </td>
                  </tr>
                ))}
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
        eyebrow="Catálogo"
        title="Produtos"
        description="Consulte a base de produtos vinculada à sua organização."
      />

      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsContent
          organizationId={organizationId}
          filters={filters}
          page={page}
        />
      </Suspense>
    </>
  );
}
