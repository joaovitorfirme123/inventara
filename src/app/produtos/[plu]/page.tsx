import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getProductDetailsByPlu } from "@/data/stock-history";
import { getCurrentOrganizationId } from "@/lib/current-organization";

export const metadata: Metadata = { title: "Detalhe do produto" };

type ProductPageProps = {
  params: Promise<{ plu: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const inventoryDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
});

const stockFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

function StockChart({ history }: { history: Array<{ id: string; stock: string }> }) {
  const snapshots = [...history].reverse();
  const values = snapshots.map((snapshot) => Number(snapshot.stock));
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const width = 800;
  const height = 260;
  const padding = 34;
  const points = snapshots.map((snapshot, index) => {
    const x = snapshots.length === 1
      ? width / 2
      : padding + (index / (snapshots.length - 1)) * (width - padding * 2);
    const y = padding + ((maximum - Number(snapshot.stock)) / range) * (height - padding * 2);
    return { id: snapshot.id, stock: snapshot.stock, x, y };
  });

  return (
    <svg
      aria-label={`Evolução do estoque em ${snapshots.length} importações`}
      className="stock-chart-svg"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <line className="stock-chart-axis" x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} />
      {points.length > 1 && (
        <polyline
          className="stock-chart-line"
          fill="none"
          points={points.map((point) => `${point.x},${point.y}`).join(" ")}
        />
      )}
      {points.map((point) => (
        <g key={point.id}>
          <circle className="stock-chart-point" cx={point.x} cy={point.y} r="6" />
          <text className="stock-chart-value" textAnchor="middle" x={point.x} y={point.y - 14}>
            {stockFormatter.format(Number(point.stock))}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { plu } = await params;
  const product = await getProductDetailsByPlu(getCurrentOrganizationId(), plu);

  if (!product) notFound();

  const variation = product.variation === null ? null : Number(product.variation);
  const variationClass = variation === null || variation === 0
    ? "neutral"
    : variation > 0
      ? "positive"
      : "negative";

  return (
    <>
      <Link className="back-link" href="/produtos">← Voltar para produtos</Link>
      <PageHeader
        eyebrow={`PLU ${product.plu}`}
        title={product.description}
        description="Dados atuais e evolução do estoque registrada em cada importação."
      />

      <section className="product-overview panel">
        <div className="product-identity">
          <span className="section-kicker">Identificação</span>
          <dl>
            <div><dt>PLU</dt><dd>{product.plu}</dd></div>
            <div><dt>Código de barras</dt><dd>{product.barcode ?? "Não informado"}</dd></div>
            <div><dt>Seção</dt><dd>{product.section ?? "Sem seção"}</dd></div>
            <div><dt>Grupo</dt><dd>{product.group ?? "Sem grupo"}</dd></div>
            <div><dt>Subgrupo</dt><dd>{product.subgroup ?? "Sem subgrupo"}</dd></div>
            <div>
              <dt>Último inventário</dt>
              <dd>{product.lastInventory ? inventoryDateFormatter.format(product.lastInventory) : "Sem data"}</dd>
            </div>
          </dl>
        </div>

        <div className="stock-position">
          <article>
            <span>Estoque atual</span>
            <strong>{stockFormatter.format(Number(product.currentStock))}</strong>
          </article>
          <article>
            <span>Estoque anterior</span>
            <strong>{product.previousStock === null ? "—" : stockFormatter.format(Number(product.previousStock))}</strong>
          </article>
          <article className={variationClass}>
            <span>Variação</span>
            <strong>
              {variation === null ? "—" : `${variation > 0 ? "+" : ""}${stockFormatter.format(variation)}`}
            </strong>
            <small>Atual menos anterior</small>
          </article>
        </div>
      </section>

      <section className="stock-evolution panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Evolução</span><h2>Histórico de estoque</h2></div>
          <span className="status-pill">{product.history.length} snapshots</span>
        </div>
        {product.history.length > 0 ? (
          <StockChart history={product.history} />
        ) : (
          <div className="stock-history-empty">
            <strong>Sem snapshots</strong>
            <p>Este produto ainda não participou de uma importação após a ativação do histórico.</p>
          </div>
        )}
      </section>

      <section className="stock-history panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Auditoria</span><h2>Importações do produto</h2></div>
        </div>
        {product.history.length > 0 ? (
          <div className="stock-history-table">
            <table>
              <thead><tr><th>Data</th><th>Importação</th><th>Estoque registrado</th></tr></thead>
              <tbody>
                {product.history.map((snapshot) => (
                  <tr key={snapshot.id}>
                    <td data-label="Data">{dateFormatter.format(snapshot.recordedAt)}</td>
                    <td data-label="Importação"><strong>{snapshot.filename}</strong><small>{snapshot.importId}</small></td>
                    <td data-label="Estoque">{stockFormatter.format(Number(snapshot.stock))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="stock-history-empty"><p>Nenhuma importação registrada para este produto.</p></div>
        )}
      </section>
    </>
  );
}
