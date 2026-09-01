import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import {
  filterInventoryRows,
  getInventoryRows,
} from "@/data/inventories";
import type { InventoryRow, InventorySort } from "@/data/inventories";
import { getCurrentOrganizationId } from "@/lib/current-organization";
import { PRIORITIES } from "@/lib/inventory-priority";
import type { InventoryPriority } from "@/lib/inventory-priority";
import type { ProductInventoryStatus } from "@/lib/inventory-status";

export const metadata: Metadata = { title: "Inventários" };

type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

const priorityClasses: Record<InventoryPriority, string> = {
  Urgente: "urgent",
  Alta: "high",
  Média: "medium",
  Baixa: "low",
  Atualizado: "updated",
};

const sortOptions: Array<{ value: InventorySort; label: string }> = [
  { value: "priority", label: "Prioridade" },
  { value: "coverage", label: "Menor cobertura" },
  { value: "pending", label: "Mais pendentes" },
  { value: "name", label: "Nome" },
];

function getParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function isPriority(value: string): value is InventoryPriority {
  return PRIORITIES.some((priority) => priority === value);
}

function isSort(value: string): value is InventorySort {
  return sortOptions.some((option) => option.value === value);
}

function createProductDrilldownHref(
  row: Pick<InventoryRow, "section" | "group" | "subgroup">,
  status?: ProductInventoryStatus,
) {
  const params = new URLSearchParams({
    section: row.section,
    group: row.group,
    subgroup: row.subgroup,
  });
  if (status) params.set("status", status);
  return `/produtos?${params.toString()}`;
}

function ProductDrilldownLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link className="inventory-drilldown-link" href={href} aria-label={label}>
      {children}
    </Link>
  );
}

export default async function InventariosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = getParam(params.q);
  const section = getParam(params.section);
  const priorityParam = getParam(params.priority);
  const priority = isPriority(priorityParam) ? priorityParam : undefined;
  const sortParam = getParam(params.sort);
  const sort = isSort(sortParam) ? sortParam : "priority";
  const pendingOnly = getParam(params.pending) === "1";
  const urgentOnly = getParam(params.urgent) === "1";
  const year = new Date().getFullYear();
  const allRows = await getInventoryRows(await getCurrentOrganizationId(), year, new Date(), sort);
  const rows = filterInventoryRows(allRows, {
    section,
    priority,
    pendingOnly,
    urgentOnly,
    query,
  });
  const sectionOptions = [...new Set(allRows.map((row) => row.section))];
  const groupedSections = Map.groupBy(rows, (row) => row.section);
  const totalSkus = rows.reduce((total, row) => total + row.totalSkus, 0);
  const countedSkus = rows.reduce((total, row) => total + row.countedSkus, 0);
  const pendingSkus = rows.reduce((total, row) => total + row.pendingSkus, 0);
  const coverage = totalSkus === 0 ? 0 : (countedSkus / totalSkus) * 100;

  return (
    <>
      <PageHeader
        eyebrow={`Ciclo ${year}`}
        title="Inventários"
        description="Priorize contagens por seção, grupo e subgrupo com base em cobertura, volume e antiguidade."
      />

      <section className="inventory-summary" aria-label="Resumo dos inventários">
        <article>
          <span>SKUs no recorte</span>
          <strong>{numberFormatter.format(totalSkus)}</strong>
        </article>
        <article>
          <span>Contados no ano</span>
          <strong>{numberFormatter.format(countedSkus)}</strong>
        </article>
        <article>
          <span>Pendentes</span>
          <strong>{numberFormatter.format(pendingSkus)}</strong>
        </article>
        <article>
          <span>Cobertura</span>
          <strong>{coverage.toFixed(1)}%</strong>
        </article>
      </section>

      <form
        className="inventory-filters panel"
        key={`${query}:${section}:${priority ?? ""}:${pendingOnly}:${urgentOnly}:${sort}`}
        method="get"
      >
        <label className="inventory-search">
          <span>Busca</span>
          <input
            defaultValue={query}
            name="q"
            placeholder="Grupo, subgrupo ou seção..."
            type="search"
          />
        </label>
        <label>
          <span>Seção</span>
          <select defaultValue={section} name="section">
            <option value="">Todas as seções</option>
            {sectionOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Prioridade</span>
          <select defaultValue={priority ?? ""} name="priority">
            <option value="">Todas as prioridades</option>
            {PRIORITIES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Ordenação</span>
          <select defaultValue={sort} name="sort">
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="pending-filter">
          <input defaultChecked={pendingOnly} name="pending" type="checkbox" value="1" />
          <span>Somente pendentes</span>
        </label>
        <label className="pending-filter">
          <input defaultChecked={urgentOnly} name="urgent" type="checkbox" value="1" />
          <span>Somente urgentes</span>
        </label>
        <div className="inventory-filter-actions">
          <button type="submit">Aplicar filtros</button>
          <Link href="/inventarios">Limpar</Link>
        </div>
      </form>

      <div className="inventory-sections">
        {Array.from(groupedSections, ([sectionName, sectionRows]) => {
          const groups = Map.groupBy(sectionRows, (row) => row.group);

          return (
            <section className="inventory-section panel" key={sectionName}>
              <header>
                <div>
                  <span className="section-kicker">Seção</span>
                  <h2>{sectionName}</h2>
                </div>
                <span>{sectionRows.length} subgrupos</span>
              </header>

              <div className="inventory-groups">
                {Array.from(groups, ([groupName, groupRows]) => {
                  const groupPending = groupRows.reduce(
                    (total, row) => total + row.pendingSkus,
                    0,
                  );

                  return (
                    <details className="inventory-group" open key={groupName}>
                      <summary>
                        <strong>{groupName}</strong>
                        <small>
                          {groupRows.length} subgrupos ·{" "}
                          {numberFormatter.format(groupPending)} pendentes
                        </small>
                      </summary>

                      <div className="inventory-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Rank</th>
                              <th>Subgrupo</th>
                              <th>SKUs</th>
                              <th>Contados</th>
                              <th>Pendentes</th>
                              <th>Cobertura</th>
                              <th>Sem data</th>
                              <th>Período</th>
                              <th>Prioridade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupRows.map((row) => (
                              <tr key={`${row.section}-${row.group}-${row.subgroup}`}>
                                <td data-label="Rank"><span className="rank">#{row.rank}</span></td>
                                <td data-label="Subgrupo"><strong>{row.subgroup}</strong></td>
                                <td data-label="SKUs">
                                  {row.totalSkus > 0 ? (
                                    <ProductDrilldownLink
                                      href={createProductDrilldownHref(row)}
                                      label={`Abrir ${row.totalSkus} produtos de ${row.section}, ${row.group}, ${row.subgroup}`}
                                    >
                                      {numberFormatter.format(row.totalSkus)}
                                    </ProductDrilldownLink>
                                  ) : numberFormatter.format(row.totalSkus)}
                                </td>
                                <td data-label="Contados">
                                  {row.countedSkus > 0 ? (
                                    <ProductDrilldownLink
                                      href={createProductDrilldownHref(row, "contado")}
                                      label={`Abrir ${row.countedSkus} produtos contados em ${year} de ${row.section}, ${row.group}, ${row.subgroup}`}
                                    >
                                      {numberFormatter.format(row.countedSkus)}
                                    </ProductDrilldownLink>
                                  ) : numberFormatter.format(row.countedSkus)}
                                </td>
                                <td data-label="Pendentes">
                                  {row.pendingSkus > 0 ? (
                                    <ProductDrilldownLink
                                      href={createProductDrilldownHref(row, "pendente")}
                                      label={`Abrir ${row.pendingSkus} produtos pendentes de ${row.section}, ${row.group}, ${row.subgroup}`}
                                    >
                                      {numberFormatter.format(row.pendingSkus)}
                                    </ProductDrilldownLink>
                                  ) : numberFormatter.format(row.pendingSkus)}
                                </td>
                                <td data-label="Cobertura">
                                  <div className="coverage-cell">
                                    <span>{row.countedPercentage.toFixed(1)}%</span>
                                    <div><i style={{ width: `${row.countedPercentage}%` }} /></div>
                                  </div>
                                </td>
                                <td data-label="Sem data">
                                  {row.noDateSkus > 0 ? (
                                    <ProductDrilldownLink
                                      href={createProductDrilldownHref(row, "sem-data")}
                                      label={`Abrir ${row.noDateSkus} produtos sem data de ${row.section}, ${row.group}, ${row.subgroup}`}
                                    >
                                      {numberFormatter.format(row.noDateSkus)}
                                    </ProductDrilldownLink>
                                  ) : numberFormatter.format(row.noDateSkus)}
                                </td>
                                <td data-label="Período">
                                  <span className="date-range">
                                    {row.oldestDate ? dateFormatter.format(row.oldestDate) : "Sem data"}
                                    <small>
                                      até {row.newestDate ? dateFormatter.format(row.newestDate) : "—"}
                                    </small>
                                  </span>
                                </td>
                                <td data-label="Prioridade">
                                  <span className={`priority-badge ${priorityClasses[row.priority]}`}>
                                    {row.priority}
                                    <small>{row.score.toFixed(1)} pts</small>
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  );
                })}
              </div>
            </section>
          );
        })}

        {rows.length === 0 && (
          <section className="inventory-empty panel">
            <span>0</span>
            <div>
              <h2>Nenhum inventário neste recorte</h2>
              <p>Limpe ou altere os filtros para visualizar outros subgrupos.</p>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
