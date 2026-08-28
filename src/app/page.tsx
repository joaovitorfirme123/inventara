import { PageHeader } from "@/components/page-header";

const metrics = [
  { label: "Total de SKUs", value: "—", detail: "Base ainda não importada" },
  { label: "Cobertura anual", value: "—", detail: "Sem dados disponíveis" },
  { label: "Itens pendentes", value: "—", detail: "Aguardando inventários" },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Visão geral"
        title="Dashboard"
        description="Acompanhe a cobertura dos inventários e os pontos que precisam de atenção."
      />

      <section className="metric-grid" aria-label="Indicadores principais">
        {metrics.map((metric, index) => (
          <article className="metric-card" key={metric.label}>
            <span className="metric-index">0{index + 1}</span>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </section>

      <section className="panel dashboard-panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Panorama</span>
            <h2>Cobertura por seção</h2>
          </div>
          <span className="status-pill">Aguardando dados</span>
        </div>
        <div className="empty-visual" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <p className="panel-note">
          Os indicadores serão exibidos aqui depois que a primeira base de
          produtos for importada.
        </p>
      </section>
    </>
  );
}
