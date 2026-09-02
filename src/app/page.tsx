import type { CSSProperties } from "react";
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { getDashboardData } from "@/data/dashboard";
import { getCurrentOrganizationId } from "@/lib/current-organization";
import type { InventoryPriority } from "@/lib/inventory-priority";

export const metadata: Metadata = { title: "Dashboard" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const numberFormatter = new Intl.NumberFormat("pt-BR");

const priorityColors: Record<InventoryPriority, string> = {
  Urgente: "#be422f",
  Alta: "#dc812d",
  Média: "#c9a62d",
  Baixa: "#58867c",
  Atualizado: "#73a146",
};

const priorityClasses: Record<InventoryPriority, string> = {
  Urgente: "urgent",
  Alta: "high",
  Média: "medium",
  Baixa: "low",
  Atualizado: "updated",
};

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-label="Carregando indicadores">
      <div />
      <div />
      <div />
      <div />
    </div>
  );
}

async function DashboardContent({
  organizationId,
  year,
}: {
  organizationId: string;
  year: number;
}) {
  const { summary, sections, priorities, recommendations, coverageHistory } = await getDashboardData(
    organizationId,
    year,
  );

  if (summary.totalSkus === 0) {
    return (
      <section className="dashboard-empty panel">
        <span>0</span>
        <div>
          <h2>Dashboard aguardando produtos</h2>
          <p>Importe uma base CSV para gerar indicadores, gráficos e o resumo por seção.</p>
        </div>
      </section>
    );
  }

  const metrics = [
    { label: "Total de SKUs", value: numberFormatter.format(summary.totalSkus), detail: "Produtos na base ativa", href: "/produtos" },
    { label: "Seções", value: numberFormatter.format(summary.totalSections), detail: "Áreas monitoradas" },
    { label: "Grupos / Subgrupos", value: `${summary.totalGroups} / ${summary.totalSubgroups}`, detail: "Estrutura de classificação" },
    { label: `Contados em ${year}`, value: numberFormatter.format(summary.countedSkus), detail: "Inventariados no ciclo", href: "/produtos?status=contado" },
    { label: "Pendentes", value: numberFormatter.format(summary.pendingSkus), detail: "Fora do ciclo atual", href: "/produtos?status=pendente" },
    { label: "Cobertura", value: `${summary.countedPercentage.toFixed(1)}%`, detail: "Percentual inventariado" },
    { label: "Sem data", value: numberFormatter.format(summary.noDateSkus), detail: "Sem histórico de contagem", href: "/produtos?status=sem-data" },
  ];
  const maxPending = Math.max(...sections.map((section) => section.pendingSkus), 1);
  const priorityTotal = priorities.reduce((total, item) => total + item.total, 0);
  const priorityGradient = priorities.map((item, index) => {
    const previousTotal = priorities
      .slice(0, index)
      .reduce((total, previous) => total + previous.total, 0);
    const start = (previousTotal / priorityTotal) * 100;
    const end = ((previousTotal + item.total) / priorityTotal) * 100;
    return `${priorityColors[item.priority]} ${start}% ${end}%`;
  }).join(", ");

  return (
    <>
      <section className="dashboard-metrics" aria-label="Indicadores gerais">
        {metrics.map((metric, index) => (
          metric.href ? (
            <Link
              aria-label={`${metric.label}: ${metric.value}. Abrir produtos`}
              className="dashboard-metric"
              href={metric.href}
              key={metric.label}
            >
              <span>0{index + 1}</span>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </Link>
          ) : (
            <article className="dashboard-metric" key={metric.label}>
              <span>0{index + 1}</span>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </article>
          )
        ))}
      </section>

      <div className="dashboard-charts">
        <section className="dashboard-chart panel">
          <div className="panel-heading">
            <div><span className="section-kicker">Cobertura</span><h2>Contados por seção</h2></div>
            <span className="status-pill">Ciclo {year}</span>
          </div>
          <div className="bar-chart">
            {sections.map((section) => (
              <div className="bar-row" key={section.section}>
                <span>{section.section}</span>
                <div><i style={{ width: `${section.countedPercentage}%` }} /></div>
                <strong>{section.countedPercentage.toFixed(1)}%</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-chart panel">
          <div className="panel-heading">
            <div><span className="section-kicker">Pendências</span><h2>Volume por seção</h2></div>
            <span className="status-pill">{numberFormatter.format(summary.pendingSkus)} SKUs</span>
          </div>
          <div className="bar-chart pending-chart">
            {sections.map((section) => (
              <div className="bar-row" key={section.section}>
                <span>{section.section}</span>
                <div><i style={{ width: `${(section.pendingSkus / maxPending) * 100}%` }} /></div>
                <strong>{numberFormatter.format(section.pendingSkus)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="priority-chart panel">
          <div>
            <span className="section-kicker">Prioridades</span>
            <h2>Distribuição dos subgrupos</h2>
            <p>Cada subgrupo recebe uma prioridade conforme volume, cobertura e antiguidade.</p>
          </div>
          <div
            className="priority-ring"
            role="img"
            aria-label={`Distribuição de ${priorityTotal} subgrupos por prioridade`}
            style={{ "--priority-gradient": `conic-gradient(${priorityGradient})` } as CSSProperties}
          >
            <strong>{numberFormatter.format(priorityTotal)}</strong>
            <span>subgrupos</span>
          </div>
          <div className="priority-legend">
            {priorities.map((item) => (
              <div key={item.priority}>
                <i style={{ background: priorityColors[item.priority] }} />
                <span>{item.priority}</span>
                <strong>{numberFormatter.format(item.total)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="coverage-history panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Evolução</span><h2>Cobertura mensal</h2></div>
          <span className="status-pill">Ciclo {year}</span>
        </div>
        {coverageHistory.length > 0 ? (
          <div className="coverage-history-chart">
            {coverageHistory.map((point) => (
              <div className="coverage-history-row" key={point.month}>
                <span>{point.label}</span>
                <div className="coverage-history-bar">
                  <i style={{ width: `${point.coveragePercentage}%` }} />
                  {point.goalPercentage !== null && <b style={{ left: `${point.goalPercentage}%` }} />}
                </div>
                <strong>{point.coveragePercentage.toFixed(1)}%</strong>
                <small>{point.goalPercentage === null ? "Sem meta" : `Meta ${point.goalPercentage.toFixed(1)}%`}</small>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-recommendation-empty"><p>A cobertura mensal aparecerá após a primeira importação de cada período.</p></div>
        )}
      </section>

      <section className="dashboard-recommendations panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Próxima contagem</span><h2>Subgrupos recomendados</h2></div>
          <span className="status-pill">{recommendations.length} de 6</span>
        </div>
        {recommendations.length > 0 ? (
          <div className="recommendation-grid">
            {recommendations.map((subgroup, index) => (
              <article className="recommendation-card" key={`${subgroup.section}-${subgroup.group}-${subgroup.subgroup}`}>
                <span className="recommendation-rank">0{index + 1}</span>
                <div className="recommendation-card-heading">
                  <div>
                    <strong><Link className="recommendation-link" href={`/inventarios?q=${encodeURIComponent(`${subgroup.section} ${subgroup.group} ${subgroup.subgroup}`)}&pending=1`}>{subgroup.subgroup}</Link></strong>
                    <small>{subgroup.section} / {subgroup.group}</small>
                  </div>
                  <span className={`dashboard-priority ${priorityClasses[subgroup.priority]}`}>{subgroup.priority}</span>
                </div>
                <dl>
                  <div><dt>Pendentes</dt><dd>{numberFormatter.format(subgroup.pendingSkus)} de {numberFormatter.format(subgroup.totalSkus)} SKUs</dd></div>
                  <div><dt>Cobertura</dt><dd>{subgroup.countedPercentage.toFixed(1)}% · {numberFormatter.format(subgroup.score)} pts</dd></div>
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <div className="dashboard-recommendation-empty"><p>Não há subgrupos pendentes para recomendar neste ciclo.</p></div>
        )}
      </section>

      <section className="section-dashboard panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Detalhamento</span><h2>Resumo por seção</h2></div>
          <span className="status-pill">{sections.length} seções</span>
        </div>
        <div className="section-dashboard-table">
          <table>
            <thead><tr><th>Seção</th><th>SKUs</th><th>Contados</th><th>Pendentes</th><th>Cobertura</th><th>Urgentes</th><th>Altas</th></tr></thead>
            <tbody>
              {sections.map((section) => (
                <tr key={section.section}>
                  <td data-label="Seção"><strong>{section.section}</strong></td>
                  <td data-label="SKUs">{numberFormatter.format(section.totalSkus)}</td>
                  <td data-label="Contados">{numberFormatter.format(section.countedSkus)}</td>
                  <td data-label="Pendentes">{numberFormatter.format(section.pendingSkus)}</td>
                  <td data-label="Cobertura"><span className="section-coverage">{section.countedPercentage.toFixed(1)}%</span></td>
                  <td data-label="Urgentes"><span className="dashboard-priority urgent">{section.urgentGroups}</span></td>
                  <td data-label="Altas"><span className="dashboard-priority high">{section.highPriorityGroups}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const currentYear = new Date().getFullYear();
  const params = await searchParams;
  const requestedYear = typeof params.year === "string" ? Number.parseInt(params.year, 10) : currentYear;
  const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= currentYear
    ? requestedYear
    : currentYear;
  const organizationId = await getCurrentOrganizationId();

  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title="Dashboard"
        description="Acompanhe a cobertura dos inventários e os pontos que precisam de atenção."
      />
      <form className="dashboard-period" method="get">
        <label>
          <span>Período consultado</span>
          <select defaultValue={year} name="year">
            {Array.from({ length: Math.min(currentYear - 2019, 6) }, (_, index) => currentYear - index).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <button type="submit">Consultar período</button>
      </form>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent organizationId={organizationId} year={year} />
      </Suspense>
    </>
  );
}
