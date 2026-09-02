import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getProductFilterOptions } from "@/data/products";
import { getCurrentOrganizationId } from "@/lib/current-organization";
import { getCoverageComparison } from "@/data/reporting";

export const metadata: Metadata = { title: "Relatórios" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parameter(params: Record<string, string | string[] | undefined>, key: string) {
  return typeof params[key] === "string" ? params[key].trim() : "";
}

function yearParameter(value: string, fallback: number) {
  const year = Number.parseInt(value, 10);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : fallback;
}

function reportUrl(path: string, values: Record<string, string>) {
  const query = new URLSearchParams(values).toString();
  return `${path}?${query}`;
}

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const currentYear = new Date().getFullYear();
  const params = await searchParams;
  const year = yearParameter(parameter(params, "year"), currentYear);
  const compareYear = yearParameter(parameter(params, "compare"), year - 1);
  const filters = {
    q: parameter(params, "q"),
    section: parameter(params, "section"),
    group: parameter(params, "group"),
    subgroup: parameter(params, "subgroup"),
    status: parameter(params, "status"),
    year: String(year),
  };
  const organizationId = await getCurrentOrganizationId();
  const allFilterOptions = await getProductFilterOptions(organizationId);
  const groupOptions = filters.section
    ? (await getProductFilterOptions(organizationId, { section: filters.section })).groups
    : allFilterOptions.groups;
  const subgroupOptions = filters.section || filters.group
    ? (await getProductFilterOptions(organizationId, { section: filters.section, group: filters.group })).subgroups
    : allFilterOptions.subgroups;
  const comparison = await getCoverageComparison(organizationId, year, compareYear);
  const exportQuery = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));

  return (
    <>
      <PageHeader
        eyebrow="Análise operacional"
        title="Relatórios"
        description="Exporte o recorte atual e compare a cobertura entre períodos sem sair do contexto da organização."
      />

      <form className="report-filters panel" method="get">
        <label><span>Busca</span><input defaultValue={filters.q} name="q" placeholder="PLU, descrição ou código" /></label>
        <label><span>Seção</span><select defaultValue={filters.section} name="section"><option value="">Todas</option>{allFilterOptions.sections.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <label><span>Grupo</span><select defaultValue={filters.group} name="group"><option value="">Todos</option>{groupOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <label><span>Subgrupo</span><select defaultValue={filters.subgroup} name="subgroup"><option value="">Todos</option>{subgroupOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <label><span>Status</span><select defaultValue={filters.status} name="status"><option value="">Todos</option><option value="contado">Contados</option><option value="pendente">Pendentes</option><option value="sem-data">Sem data</option></select></label>
        <label><span>Período</span><input defaultValue={year} max="2100" min="2000" name="year" type="number" /></label>
        <label><span>Comparar com</span><input defaultValue={compareYear} max="2100" min="2000" name="compare" type="number" /></label>
        <button type="submit">Atualizar relatório</button>
      </form>

      <section className="report-actions panel">
        <div><span className="section-kicker">Saída de dados</span><h2>Exportar cadastro e relatórios</h2><p>Os arquivos incluem os filtros e metadados deste recorte.</p></div>
        <div className="report-action-links">
          <Link className="secondary-action" href={reportUrl("/api/produtos/export", exportQuery)}>Baixar CSV</Link>
          <Link className="primary-action" href={reportUrl("/api/relatorios/export.xlsx", exportQuery)}>Baixar Excel</Link>
          <Link className="secondary-action" href={reportUrl("/api/relatorios/export.pdf", exportQuery)}>Baixar PDF</Link>
        </div>
      </section>

      <section className="report-comparison panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Comparação temporal</span><h2>{year} versus {compareYear}</h2></div>
          <span className="status-pill">Cobertura</span>
        </div>
        <div className="report-comparison-summary">
          <article><span>{year}</span><strong>{comparison.current.coveragePercentage === null ? "—" : `${comparison.current.coveragePercentage.toFixed(1)}%`}</strong><small>último registro</small></article>
          <article><span>{compareYear}</span><strong>{comparison.previous.coveragePercentage === null ? "—" : `${comparison.previous.coveragePercentage.toFixed(1)}%`}</strong><small>último registro</small></article>
          <article><span>Variação</span><strong>{comparison.variation === null ? "—" : `${comparison.variation >= 0 ? "+" : ""}${comparison.variation.toFixed(1)} p.p.`}</strong><small>diferença entre períodos</small></article>
        </div>
        {comparison.monthly.length > 0 ? (
          <div className="report-comparison-table">
            <table><thead><tr><th>Mês</th><th>{year}</th><th>{compareYear}</th><th>Variação</th></tr></thead><tbody>
              {comparison.monthly.map((month) => {
                const variation = month.currentCoverage !== null && month.previousCoverage !== null ? month.currentCoverage - month.previousCoverage : null;
                return <tr key={month.month}><td>{month.label}</td><td>{month.currentCoverage === null ? "—" : `${month.currentCoverage.toFixed(1)}%`}</td><td>{month.previousCoverage === null ? "—" : `${month.previousCoverage.toFixed(1)}%`}</td><td>{variation === null ? "—" : `${variation >= 0 ? "+" : ""}${variation.toFixed(1)} p.p.`}</td></tr>;
              })}
            </tbody></table>
          </div>
        ) : <div className="report-empty"><p>Não há fechamentos mensais para comparar nos períodos selecionados.</p></div>}
      </section>
    </>
  );
}
