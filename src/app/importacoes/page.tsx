import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CsvImporter } from "@/components/csv-importer";
import { ImportTemplateManager } from "@/components/import-template-manager";
import { PageHeader } from "@/components/page-header";
import { listImportsByOrganization } from "@/data/imports";
import { listImportTemplates } from "@/data/import-templates";
import { requireOrganizationSessionContext } from "@/lib/session";

export const metadata: Metadata = { title: "Importações" };

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

export default async function ImportacoesPage() {
  await connection();
  const session = await requireOrganizationSessionContext();
  const organizationId = session.user.organizationId;
  const [imports, templates] = await Promise.all([
    listImportsByOrganization(organizationId),
    listImportTemplates(organizationId),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Entrada de dados"
        title="Importações"
        description="Valide a exportação do ERP e acompanhe os resultados processados."
      />
      <ImportTemplateManager templates={templates} canManage={session.user.role === "OWNER"} />
      <CsvImporter templates={templates} />

      <section className="import-history panel">
        <div className="history-heading">
          <div>
            <span className="section-kicker">Auditoria</span>
            <h2>Histórico de importações</h2>
          </div>
          <span>Últimos 50 registros</span>
        </div>

        {imports.length > 0 ? (
          <div className="history-table">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Arquivo</th>
                  <th>Layout</th>
                  <th>Processados</th>
                  <th>Inseridos</th>
                  <th>Atualizados</th>
                  <th>Erros</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Data">{dateFormatter.format(item.importedAt)}</td>
                    <td data-label="Arquivo">
                      <Link className="history-file-link" href={`/importacoes/${item.id}`}>
                        <strong>{item.filename}</strong>
                      </Link>
                    </td>
                    <td data-label="Layout">
                      {item.templateRevision
                        ? `${item.templateRevision.template.name} · v${item.templateRevision.version}`
                        : "Padrão"}
                    </td>
                    <td data-label="Processados">{numberFormatter.format(item.totalRows)}</td>
                    <td data-label="Inseridos">{numberFormatter.format(item.insertedRows)}</td>
                    <td data-label="Atualizados">{numberFormatter.format(item.updatedRows)}</td>
                    <td data-label="Erros">
                      <span className={item.errorRows > 0 ? "error-count" : "zero-count"}>
                        {numberFormatter.format(item.errorRows)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="history-empty">
            <span>HST</span>
            <div>
              <h3>Nenhuma importação registrada</h3>
              <p>O primeiro processamento concluído aparecerá aqui.</p>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
