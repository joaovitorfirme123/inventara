import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { VendasFiltros } from "@/components/vendas-filtros";
import { VendasImportacoes } from "@/components/vendas-importacoes";
import type { SalesImportItem } from "@/components/vendas-importacoes";
import { VendasImporter } from "@/components/vendas-importer";
import {
  getSalesFilterOptions,
  getSalesRange,
  getSalesSummary,
  getSalesTotals,
  listSalesImports,
  SEM_CADASTRO,
} from "@/data/vendas";
import type { SalesFilters, SalesSummaryRow } from "@/data/vendas";
import { requireOrganizationSessionContext } from "@/lib/session";

export const metadata: Metadata = { title: "Vendas" };

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const numberFormatter = new Intl.NumberFormat("pt-BR");
const quantityFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 3,
});

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDateParam(value: string | string[] | undefined) {
  const raw = firstParam(value)?.trim() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined;
}

function parseTextParam(value: string | string[] | undefined) {
  const raw = firstParam(value)?.trim() ?? "";
  return raw || undefined;
}

function isoInSaoPaulo(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

type SectionBucket = {
  name: string;
  total: number;
  groups: Map<string, { name: string; total: number; rows: SalesSummaryRow[] }>;
};

function groupBySection(rows: SalesSummaryRow[]) {
  const sections = new Map<string, SectionBucket>();

  for (const row of rows) {
    let section = sections.get(row.section);
    if (!section) {
      section = { name: row.section, total: 0, groups: new Map() };
      sections.set(row.section, section);
    }
    section.total += row.totalValue;

    let group = section.groups.get(row.group);
    if (!group) {
      group = { name: row.group, total: 0, rows: [] };
      section.groups.set(row.group, group);
    }
    group.total += row.totalValue;
    group.rows.push(row);
  }

  const sorted = [...sections.values()].sort((a, b) => b.total - a.total);
  for (const section of sorted) {
    const groups = [...section.groups.values()].sort((a, b) => b.total - a.total);
    for (const group of groups) {
      group.rows.sort((a, b) => b.totalValue - a.totalValue);
    }
    section.groups = new Map(groups.map((group) => [group.name, group]));
  }

  return sorted;
}

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await requireOrganizationSessionContext();
  const organizationId = session.user.organizationId;
  const params = await searchParams;

  const filters: SalesFilters = {
    from: parseDateParam(params.de),
    to: parseDateParam(params.ate),
    section: parseTextParam(params.secao),
    group: parseTextParam(params.grupo),
    subgroup: parseTextParam(params.subgrupo),
  };

  const range = await getSalesRange(organizationId);
  const hasSales = Boolean(range.min);

  const emptyTotals = { totalValue: 0, totalQuantity: 0, pluCount: 0, daysCount: 0, rowCount: 0 };
  const [totals, summaryRows, options, imports] = hasSales
    ? await Promise.all([
        getSalesTotals(organizationId, filters),
        getSalesSummary(organizationId, filters),
        getSalesFilterOptions(organizationId, filters),
        listSalesImports(organizationId),
      ])
    : [
        emptyTotals,
        [] as SalesSummaryRow[],
        { sections: [] as string[], groups: [] as string[], subgroups: [] as string[] },
        [] as Awaited<ReturnType<typeof listSalesImports>>,
      ];

  const hojeIso = isoInSaoPaulo(new Date());
  const [anoAtual, mesAtual] = hojeIso.split("-");
  let anoMesPassado = Number(anoAtual);
  let mesPassado = Number(mesAtual) - 1;
  if (mesPassado === 0) {
    mesPassado = 12;
    anoMesPassado -= 1;
  }
  const mesPassadoFmt = String(mesPassado).padStart(2, "0");
  const ultimoDiaMesPassado = new Date(Date.UTC(anoMesPassado, mesPassado, 0)).getUTCDate();

  const presets = [
    { label: "Todo o período", href: "/vendas" },
    { label: `Ano de ${anoAtual}`, href: `/vendas?de=${anoAtual}-01-01&ate=${anoAtual}-12-31` },
    { label: "Este mês", href: `/vendas?de=${anoAtual}-${mesAtual}-01&ate=${hojeIso}` },
    {
      label: "Mês passado",
      href: `/vendas?de=${anoMesPassado}-${mesPassadoFmt}-01&ate=${anoMesPassado}-${mesPassadoFmt}-${String(ultimoDiaMesPassado).padStart(2, "0")}`,
    },
  ];

  const sections = groupBySection(summaryRows);
  const serializedImports: SalesImportItem[] = imports.map((item) => ({
    id: item.id,
    filename: item.filename,
    importedAt: item.importedAt.toISOString(),
    status: item.status as SalesImportItem["status"],
    periodStart: item.periodStart ? item.periodStart.toISOString().slice(0, 10) : null,
    periodEnd: item.periodEnd ? item.periodEnd.toISOString().slice(0, 10) : null,
    totalRows: item.totalRows,
    errorRows: item.errorRows,
    newRows: item.newRows,
    activeRows: item.activeRows,
    unmappedPlus: item.unmappedPlus,
  }));

  const semCadastro = sections.find((section) => section.name === SEM_CADASTRO);
  const filtersActive = Boolean(
    filters.from || filters.to || filters.section || filters.group || filters.subgroup,
  );

  return (
    <>
      <PageHeader
        eyebrow="Vendas"
        title="Análise de vendas"
        description="Importe o relatório de vendas do ERP e analise por seção, grupo, subgrupo e período. A classificação vem do cadastro de produtos e o arquivo é só lido: nada volta ao ERP e os inventários não são alterados."
      />

      <VendasImporter />

      {hasSales ? (
        <>
          <nav className="vendas-presets" aria-label="Atalhos de período">
            {presets.map((preset) => (
              <Link key={preset.label} href={preset.href} className="vendas-preset">
                {preset.label}
              </Link>
            ))}
            <span className="vendas-range">
              Dados de {range.min?.split("-").reverse().join("/")} a {range.max?.split("-").reverse().join("/")}
            </span>
          </nav>

          <VendasFiltros
            key={`${filters.from ?? ""}:${filters.to ?? ""}:${filters.section ?? ""}:${filters.group ?? ""}:${filters.subgroup ?? ""}`}
            filters={{
              de: filters.from ?? "",
              ate: filters.to ?? "",
              secao: filters.section ?? "",
              grupo: filters.group ?? "",
              subgrupo: filters.subgroup ?? "",
            }}
            options={options}
          />

          <div className="dashboard-metrics">
            <div className="dashboard-metric">
              <span>Valor vendido{filtersActive ? " no filtro" : ""}</span>
              <strong>{currencyFormatter.format(totals.totalValue)}</strong>
            </div>
            <div className="dashboard-metric">
              <span>Unidades</span>
              <strong>{quantityFormatter.format(totals.totalQuantity)}</strong>
            </div>
            <div className="dashboard-metric">
              <span>PLUs vendidos</span>
              <strong>{numberFormatter.format(totals.pluCount)}</strong>
            </div>
            <div className="dashboard-metric">
              <span>Dias com vendas</span>
              <strong>{numberFormatter.format(totals.daysCount)}</strong>
            </div>
          </div>

          {sections.length > 0 ? (
            <section className="import-history panel">
              <div className="history-heading">
                <div>
                  <span className="section-kicker">Resultado</span>
                  <h2>Vendas por seção, grupo e subgrupo</h2>
                </div>
                <span>{numberFormatter.format(totals.rowCount)} linhas de venda</span>
              </div>
              <div className="history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Classificação</th>
                      <th>Valor</th>
                      <th>Quantidade</th>
                      <th>PLUs</th>
                      <th>% do total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((section) => (
                      <SectionRows
                        key={section.name}
                        section={section}
                        total={totals.totalValue}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {semCadastro && (
                <p className="action-feedback">
                  {currencyFormatter.format(semCadastro.total)} em PLUs que não estão no cadastro de
                  produtos aparecem como &quot;{SEM_CADASTRO}&quot;. Importe o cadastro atualizado na
                  aba Importações para classificar essas vendas.
                </p>
              )}
            </section>
          ) : (
            <section className="panel empty-section">
              <span className="section-kicker">Sem resultados</span>
              <h2>Nenhuma venda encontrada</h2>
              <p>
                Não há vendas para os filtros escolhidos. Ajuste o período ou a classificação, ou{" "}
                <Link href="/vendas" className="inline-link">limpe os filtros</Link>.
              </p>
            </section>
          )}

          <VendasImportacoes imports={serializedImports} />
        </>
      ) : (
        <section className="panel empty-section">
          <span className="section-kicker">Comece aqui</span>
          <h2>Nenhuma venda importada ainda</h2>
          <p>
            Envie acima o relatório de vendas exportado do ERP. Depois da importação, os filtros por
            período, seção, grupo e subgrupo aparecem aqui.
          </p>
        </section>
      )}
    </>
  );
}

function SectionRows({
  section,
  total,
}: {
  section: SectionBucket;
  total: number;
}) {
  const percent = total > 0 ? (section.total / total) * 100 : 0;

  return (
    <>
      <tr className="vendas-section-row">
        <td>
          <strong>{section.name}</strong>
        </td>
        <td>{currencyFormatter.format(section.total)}</td>
        <td />
        <td />
        <td>{percent.toFixed(1)}%</td>
      </tr>
      {[...section.groups.values()].map((group) => (
        <GroupRows key={`${section.name}:${group.name}`} sectionName={section.name} group={group} total={total} />
      ))}
    </>
  );
}

function GroupRows({
  sectionName,
  group,
  total,
}: {
  sectionName: string;
  group: { name: string; total: number; rows: SalesSummaryRow[] };
  total: number;
}) {
  const percent = total > 0 ? (group.total / total) * 100 : 0;

  return (
    <>
      <tr className="vendas-group-row">
        <td>{group.name}</td>
        <td>{currencyFormatter.format(group.total)}</td>
        <td />
        <td />
        <td>{percent.toFixed(1)}%</td>
      </tr>
      {group.rows.map((row) => (
        <tr key={`${sectionName}:${group.name}:${row.subgroup}`} className="vendas-subgroup-row">
          <td>{row.subgroup}</td>
          <td>{currencyFormatter.format(row.totalValue)}</td>
          <td>{quantityFormatter.format(row.totalQuantity)}</td>
          <td>{numberFormatter.format(row.pluCount)}</td>
          <td>{total > 0 ? `${((row.totalValue / total) * 100).toFixed(1)}%` : "—"}</td>
        </tr>
      ))}
    </>
  );
}
