"use client";

import { useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseCsvBuffer } from "@/lib/csv";
import type { CsvImportConfig, CsvParseResult, CsvRowError } from "@/lib/csv";
import {
  hasAllowedImportExtension,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
} from "@/lib/import-limits";

type ImportSummary = {
  importId: string;
  processedRows: number;
  insertedRows: number;
  updatedRows: number;
  errorRows: number;
  errors: CsvRowError[];
};

type ImportState = "idle" | "reading" | "ready" | "processing" | "complete" | "error";

type ImportTemplateOption = {
  id: string;
  name: string;
  revisionId: string;
  version: number;
  configuration: CsvImportConfig;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

function delimiterName(delimiter: string) {
  if (delimiter === ";") return "ponto e vírgula";
  if (delimiter === ",") return "vírgula";
  if (delimiter === "\t") return "tabulação";
  return delimiter;
}

export function CsvImporter({ templates }: { templates: ImportTemplateOption[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvParseResult | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [state, setState] = useState<ImportState>("idle");
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [templateRevisionId, setTemplateRevisionId] = useState("");

  const selectedTemplate = templates.find((template) => template.revisionId === templateRevisionId);

  async function handleSelectedFile(selectedFile: File | null, revisionId = templateRevisionId) {
    setFile(selectedFile);
    setPreview(null);
    setSummary(null);
    setMessage("");

    if (!selectedFile) {
      setState("idle");
      return;
    }

    if (!hasAllowedImportExtension(selectedFile.name)) {
      setFile(null);
      setState("error");
      setMessage("Formato inválido. Envie um arquivo com extensão .csv.");
      return;
    }

    if (selectedFile.size > MAX_IMPORT_FILE_BYTES) {
      setFile(null);
      setState("error");
      setMessage(
        `O arquivo excede o limite de ${Math.round(
          MAX_IMPORT_FILE_BYTES / (1024 * 1024),
        )} MB.`,
      );
      return;
    }

    setState("reading");

    try {
      const template = templates.find((item) => item.revisionId === revisionId);
      const result = parseCsvBuffer(await selectedFile.arrayBuffer(), template?.configuration);

      if (result.totalRows > MAX_IMPORT_ROWS) {
        setState("error");
        setMessage(
          `O arquivo possui ${numberFormatter.format(
            result.totalRows,
          )} registros, acima do limite de ${numberFormatter.format(
            MAX_IMPORT_ROWS,
          )}.`,
        );
        return;
      }

      setPreview(result);
      setState(result.fatalErrors.length > 0 ? "error" : "ready");
      setMessage(result.fatalErrors.join(" "));
    } catch {
      setState("error");
      setMessage("Não foi possível ler o arquivo selecionado.");
    }
  }

  function handleTemplateChange(revisionId: string) {
    setTemplateRevisionId(revisionId);
    if (file) void handleSelectedFile(file, revisionId);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    event.target.value = "";
    void handleSelectedFile(selectedFile);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    void handleSelectedFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function confirmImport() {
    if (!file || !preview || preview.rows.length === 0) return;

    setState("processing");
    setMessage("");
    const formData = new FormData();
    formData.set("file", file);
    if (templateRevisionId) formData.set("templateRevisionId", templateRevisionId);

    try {
      const response = await fetch("/api/importacoes", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as ImportSummary & { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Falha ao processar o arquivo.");
      }

      setSummary(body);
      setState("complete");
      router.refresh();
    } catch (error: unknown) {
      setState("error");
      setMessage(
        error instanceof Error ? error.message : "Falha ao processar o arquivo.",
      );
    }
  }

  return (
    <div className="import-workflow">
      <section
        className={isDragging ? "import-picker panel dragging" : "import-picker panel"}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="import-step">01</div>
        <div>
          <span className="section-kicker">Selecionar arquivo</span>
          <h2>Carregue a exportação do ERP</h2>
          <p>
            {selectedTemplate
              ? `Usando o template ${selectedTemplate.name}, revisão ${selectedTemplate.version}. `
              : "Use o formato padrão com PLU, código de barras, descrição, classificação, último inventário e estoque atual. "}
            Limites: {numberFormatter.format(MAX_IMPORT_FILE_BYTES / 1024 / 1024)} MB e {numberFormatter.format(MAX_IMPORT_ROWS)} registros.
          </p>
        </div>
        <div className="file-actions">
          <label>
            Layout do arquivo
            <select onChange={(event) => handleTemplateChange(event.target.value)} value={templateRevisionId}>
              <option value="">Formato padrão</option>
              {templates.map((template) => (
                <option key={template.revisionId} value={template.revisionId}>{template.name} · revisão {template.version}</option>
              ))}
            </select>
          </label>
          <label className="file-button">
            Escolher CSV
            <input accept=".csv,text/csv" onChange={handleInput} type="file" />
          </label>
          <small>ou arraste e solte o arquivo aqui</small>
        </div>
        {file && (
          <div className="selected-file">
            <strong>{file.name}</strong>
            <span>{numberFormatter.format(file.size)} bytes</span>
          </div>
        )}
      </section>

      {(state === "reading" || state === "processing") && (
        <section className="import-progress panel" aria-busy="true" aria-live="polite">
          <div className="progress-track" aria-hidden="true"><span /></div>
          <strong>
            {state === "reading" ? "Lendo e validando CSV..." : "Atualizando produtos..."}
          </strong>
          <p>Não feche esta página durante o processamento.</p>
        </section>
      )}

      {preview && state !== "reading" && (
        <section className="import-preview panel">
          <div className="panel-heading">
            <div>
              <span className="section-kicker">02 / Prévia</span>
              <h2>Validação do arquivo</h2>
            </div>
            <div className="csv-meta">
              <span>Layout: {selectedTemplate ? `${selectedTemplate.name} · v${selectedTemplate.version}` : "Padrão"}</span>
              <span>{preview.encoding}</span>
              <span>Separador: {delimiterName(preview.delimiter)}</span>
              <span>{numberFormatter.format(preview.totalRows)} linhas</span>
            </div>
          </div>

          {message && <p className="import-error" role="alert">{message}</p>}

          {preview.rows.length > 0 && (
            <div className="preview-table">
              <table>
                <thead>
                  <tr>
                    <th>PLU</th>
                    <th>Descrição</th>
                    <th>Seção</th>
                    <th>Último inventário</th>
                    <th>Estoque</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 8).map((row) => (
                    <tr key={row.plu}>
                      <td data-label="PLU">{row.plu}</td>
                      <td data-label="Descrição">{row.description}</td>
                      <td data-label="Seção">{row.section ?? "—"}</td>
                      <td data-label="Último inventário">{row.lastInventory ?? "Sem data"}</td>
                      <td data-label="Estoque">{row.currentStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.errors.length > 0 && (
            <div className="preview-errors">
              <strong>{preview.errors.length} linhas com erro</strong>
              {preview.errors.slice(0, 5).map((error) => (
                <p key={`${error.row}-${error.message}`}>
                  Linha {error.row}: {error.message}
                </p>
              ))}
            </div>
          )}

          {state !== "processing" && state !== "complete" && (
            <div className="confirm-row">
              <p>{preview.rows.length} registros válidos prontos para importar.</p>
              <button
                disabled={preview.rows.length === 0 || preview.fatalErrors.length > 0}
                onClick={confirmImport}
                type="button"
              >
                Confirmar importação
              </button>
            </div>
          )}
        </section>
      )}

      {summary && state === "complete" && (
        <section className="import-result panel" aria-live="polite">
          <div>
            <span className="section-kicker">03 / Concluído</span>
            <h2>Importação processada</h2>
          </div>
          <div className="result-grid">
            <article><strong>{numberFormatter.format(summary.processedRows)}</strong><span>Processados</span></article>
            <article><strong>{numberFormatter.format(summary.insertedRows)}</strong><span>Novos</span></article>
            <article><strong>{numberFormatter.format(summary.updatedRows)}</strong><span>Atualizados</span></article>
            <article><strong>{numberFormatter.format(summary.errorRows)}</strong><span>Erros</span></article>
          </div>
          <Link className="import-detail-link" href={`/importacoes/${summary.importId}`}>
            Ver detalhes desta importação →
          </Link>
          {summary.errors.length > 0 && (
            <div className="result-errors">
              <strong>{summary.errors.length} linhas ignoradas</strong>
              {summary.errors.slice(0, 5).map((error) => (
                <p key={`${error.row}-${error.message}`}>
                  Linha {error.row}: {error.message}
                </p>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
