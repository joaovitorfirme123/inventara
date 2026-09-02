import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getImportDetails } from "@/data/imports";
import { getCurrentOrganizationId } from "@/lib/current-organization";

export const metadata: Metadata = { title: "Detalhes da importação" };

type ImportDetailsPageProps = {
  params: Promise<{ importId: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

function statusLabel(status: "INSERTED" | "UPDATED" | "ERROR") {
  if (status === "INSERTED") return "Inserido";
  if (status === "UPDATED") return "Atualizado";
  return "Erro";
}

export default async function ImportDetailsPage({ params }: ImportDetailsPageProps) {
  const { importId } = await params;
  const item = await getImportDetails(await getCurrentOrganizationId(), importId);

  if (!item) notFound();

  const successfulRows = item.rows.filter((row) => row.status !== "ERROR");
  const errorRows = item.rows.filter((row) => row.status === "ERROR");

  return (
    <>
      <Link className="back-link" href="/importacoes">← Voltar para importações</Link>
      <PageHeader
        eyebrow="Auditoria de entrada"
        title={item.filename}
        description={`Importação concluída em ${dateFormatter.format(item.importedAt)}.`}
      />

      <p className="import-template-note">
        Layout aplicado: {item.templateRevision
          ? `${item.templateRevision.template.name}, revisão ${item.templateRevision.version}`
          : "formato padrão"}.
      </p>

      <section className="import-detail-summary panel">
        <article><span>Processados</span><strong>{numberFormatter.format(item.totalRows)}</strong></article>
        <article><span>Inseridos</span><strong>{numberFormatter.format(item.insertedRows)}</strong></article>
        <article><span>Atualizados</span><strong>{numberFormatter.format(item.updatedRows)}</strong></article>
        <article className={item.errorRows > 0 ? "has-errors" : "no-errors"}>
          <span>Erros</span><strong>{numberFormatter.format(item.errorRows)}</strong>
        </article>
      </section>

      <section className="import-detail-section panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Produtos</span><h2>Linhas processadas</h2></div>
          <span className="status-pill">{successfulRows.length} linhas</span>
        </div>
        {successfulRows.length > 0 ? (
          <div className="history-table">
            <table>
              <thead><tr><th>Linha</th><th>Status</th><th>PLU</th><th>Descrição</th><th /></tr></thead>
              <tbody>
                {successfulRows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Linha">{row.rowNumber}</td>
                    <td data-label="Status"><span className="import-row-status success">{statusLabel(row.status)}</span></td>
                    <td data-label="PLU">{row.plu ?? "—"}</td>
                    <td data-label="Descrição"><strong>{row.description ?? "—"}</strong></td>
                    <td data-label="Ação">
                      {row.plu ? <Link className="table-link" href={`/produtos/${encodeURIComponent(row.plu)}`}>Abrir produto</Link> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="history-empty">
            <p>{item.rows.length === 0 && item.totalRows > 0
              ? "Os detalhes por linha não estão disponíveis para esta importação."
              : "Nenhuma linha válida foi processada."}</p>
          </div>
        )}
      </section>

      <section className="import-detail-section panel">
        <div className="panel-heading">
          <div><span className="section-kicker">Validação</span><h2>Linhas com erro</h2></div>
          <span className="status-pill">{errorRows.length} linhas</span>
        </div>
        {errorRows.length > 0 ? (
          <div className="history-table">
            <table>
              <thead><tr><th>Linha</th><th>PLU</th><th>Descrição</th><th>Campo</th><th>Motivo</th></tr></thead>
              <tbody>
                {errorRows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Linha">{row.rowNumber}</td>
                    <td data-label="PLU">{row.plu ?? "—"}</td>
                    <td data-label="Descrição">{row.description ?? "—"}</td>
                    <td data-label="Campo">{row.field ?? "—"}</td>
                    <td data-label="Motivo"><strong>{row.message ?? "Linha inválida."}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="history-empty">
            <p>{item.rows.length === 0 && item.errorRows > 0
              ? "Os detalhes dos erros não estão disponíveis para esta importação."
              : "Nenhum erro foi encontrado nesta importação."}</p>
          </div>
        )}
      </section>
    </>
  );
}
