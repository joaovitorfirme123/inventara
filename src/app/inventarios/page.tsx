import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  filterInventoryRows,
  getInventoryRows,
} from "@/data/inventories";
import { getCurrentOrganizationId } from "@/lib/current-organization";
import { PRIORITIES } from "@/lib/inventory-priority";
import type { InventoryPriority } from "@/lib/inventory-priority";

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

function getParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function isPriority(value: string): value is InventoryPriority {
  return PRIORITIES.some((priority) => priority === value);
}

export default async function InventariosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const section = getParam(params.section);
  const priorityParam = getParam(params.priority);
  const priority = isPriority(priorityParam) ? priorityParam : undefined;
  const pendingOnly = getParam(params.pending) === "1";
  const year = new Date().getFullYear();
  const allRows = await getInventoryRows(getCurrentOrganizationId(), year);
  const rows = filterInventoryRows(allRows, {
    section,
    priority,
    pendingOnly,
  });
  const sectionOptions = [...new Set(allRows.map((row) => row.section))];
  const groupedRows = Map.groupBy(rows, (row) => row.section);
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
        key={`${section}:${priority ?? ""}:${pendingOnly}`}
        method="get"
      >
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
        <label className="pending-filter">
          <input defaultChecked={pendingOnly} name="pending" type="checkbox" value="1" />
          <span>Mostrar somente pendentes</span>
        </label>
        <div className="inventory-filter-actions">
          <button type="submit">Aplicar filtros</button>
          <Link href="/inventarios">Limpar</Link>
        </div>
      </form>

      <div className="inventory-sections">
        {Array.from(groupedRows, ([sectionName, sectionRows]) => (
          <section className="inventory-section panel" key={sectionName}>
            <header>
              <div>
                <span className="section-kicker">Seção</span>
                <h2>{sectionName}</h2>
              </div>
              <span>{sectionRows.length} subgrupos</span>
            </header>

            <div className="inventory-table">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Grupo / Subgrupo</th>
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
                  {sectionRows.map((row) => (
                    <tr key={`${row.section}-${row.group}-${row.subgroup}`}>
                      <td data-label="Rank"><span className="rank">#{row.rank}</span></td>
                      <td data-label="Grupo / Subgrupo">
                        <strong>{row.group}</strong>
                        <small>{row.subgroup}</small>
                      </td>
                      <td data-label="SKUs">{numberFormatter.format(row.totalSkus)}</td>
                      <td data-label="Contados">{numberFormatter.format(row.countedSkus)}</td>
                      <td data-label="Pendentes">{numberFormatter.format(row.pendingSkus)}</td>
                      <td data-label="Cobertura">
                        <div className="coverage-cell">
                          <span>{row.countedPercentage.toFixed(1)}%</span>
                          <div><i style={{ width: `${row.countedPercentage}%` }} /></div>
                        </div>
                      </td>
                      <td data-label="Sem data">{numberFormatter.format(row.noDateSkus)}</td>
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
          </section>
        ))}

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
