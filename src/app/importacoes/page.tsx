import type { Metadata } from "next";
import { connection } from "next/server";
import { CsvImporter } from "@/components/csv-importer";
import { PageHeader } from "@/components/page-header";
import { listImportsByOrganization } from "@/data/imports";
import { getCurrentOrganizationId } from "@/lib/current-organization";

export const metadata: Metadata = { title: "Importações" };

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

export default async function ImportacoesPage() {
  await connection();
  const imports = await listImportsByOrganization(await getCurrentOrganizationId());

  return (
    <>
      <PageHeader
        eyebrow="Entrada de dados"
        title="Importações"
        description="Valide a exportação do ERP e acompanhe os resultados processados."
      />
      <CsvImporter />

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
                    <td data-label="Arquivo"><strong>{item.filename}</strong></td>
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
