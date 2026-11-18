"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  hasAllowedImportExtension,
  MAX_IMPORT_COMPRESSED_BYTES,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
} from "@/lib/import-limits";
import {
  formatSalesPeriod,
  VendasRevisao,
} from "@/components/vendas-revisao";
import type {
  SalesApplyResult,
  SalesStagingSummary,
} from "@/components/vendas-revisao";

type ImportState = "idle" | "processing" | "review" | "complete" | "error";

const numberFormatter = new Intl.NumberFormat("pt-BR");

export function VendasImporter() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<SalesStagingSummary | null>(null);
  const [applied, setApplied] = useState<SalesApplyResult | null>(null);
  const [state, setState] = useState<ImportState>("idle");
  const [message, setMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  async function upload(selectedFile: File) {
    setState("processing");
    setMessage("");

    try {
      // Compacta o CSV no navegador: a hospedagem limita cada envio a 4,5 MB,
      // e um CSV de até 10 MB costuma ficar bem abaixo disso em gzip.
      let uploadFile = selectedFile;
      if (typeof CompressionStream !== "undefined") {
        const compressedBlob = await new Response(
          selectedFile.stream().pipeThrough(new CompressionStream("gzip")),
        ).blob();
        if (compressedBlob.size > MAX_IMPORT_COMPRESSED_BYTES) {
          setState("error");
          setMessage(
            "Mesmo compactado, o arquivo ficou grande demais para o envio. Divida o período em arquivos menores.",
          );
          return;
        }
        uploadFile = new File([compressedBlob], `${selectedFile.name}.gz`, {
          type: "application/gzip",
        });
      }

      const formData = new FormData();
      formData.append("file", uploadFile);
      const response = await fetch("/api/vendas/importacoes", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as
        | (Partial<SalesStagingSummary> & { error?: string; alreadyPendingId?: string })
        | null;

      if (payload?.alreadyPendingId) {
        const resume = await fetch(`/api/vendas/importacoes/${encodeURIComponent(payload.alreadyPendingId)}`);
        const resumed = (await resume.json().catch(() => null)) as SalesStagingSummary | null;
        if (resume.ok && resumed) {
          setSummary(resumed);
          setState("review");
          return;
        }
      }

      if (!response.ok) {
        setState("error");
        setMessage(
          payload?.error ??
            (response.status === 413
              ? "O arquivo é grande demais para o envio. Divida o período em arquivos menores."
              : "Não foi possível processar o arquivo."),
        );
        return;
      }

      setSummary(payload as SalesStagingSummary);
      setState("review");
    } catch {
      setState("error");
      setMessage("Falha de conexão ao enviar o arquivo. Tente novamente.");
    }
  }

  function handleSelectedFile(selectedFile: File | null) {
    setFile(selectedFile);
    setSummary(null);
    setApplied(null);
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
        `O arquivo excede o limite de ${Math.round(MAX_IMPORT_FILE_BYTES / (1024 * 1024))} MB.`,
      );
      return;
    }

    void upload(selectedFile);
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    handleSelectedFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleSelectedFile(event.dataTransfer.files?.[0] ?? null);
  }

  return (
    <div className="import-workflow">
      <section
        className={isDragging ? "import-picker panel dragging" : "import-picker panel"}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDrop={handleDrop}
      >
        <div className="import-step">01</div>
        <div>
          <span className="section-kicker">Importar vendas</span>
          <h2>Carregue o relatório de vendas do ERP</h2>
          <p>
            Use o relatório de vendas por item (PLU, data, cupom, quantidade e valor). Nada é gravado
            antes da sua revisão. A classificação em seção, grupo e subgrupo vem do cadastro de
            produtos, que continua sendo atualizado na aba Importações. Limites:{" "}
            {numberFormatter.format(MAX_IMPORT_FILE_BYTES / 1024 / 1024)} MB e{" "}
            {numberFormatter.format(MAX_IMPORT_ROWS)} registros.
          </p>
        </div>
        <div className="file-actions">
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

      {state === "processing" && (
        <section className="import-progress panel" aria-busy="true" aria-live="polite">
          <div className="progress-track" aria-hidden="true"><span /></div>
          <strong>Lendo o arquivo e comparando com as vendas já gravadas...</strong>
        </section>
      )}

      {state === "error" && message && (
        <p className="import-error" role="alert">{message}</p>
      )}

      {summary && state === "review" && (
        <VendasRevisao
          summary={summary}
          onApplied={(result) => {
            setApplied(result);
            setState("complete");
            router.refresh();
          }}
          onDiscarded={() => {
            setSummary(null);
            setFile(null);
            setState("idle");
            router.refresh();
          }}
        />
      )}

      {applied && state === "complete" && summary && (
        <section className="import-result panel" aria-live="polite">
          <div>
            <span className="section-kicker">03 / Concluído</span>
            <h2>
              Vendas gravadas · {formatSalesPeriod(applied.periodStart, applied.periodEnd)}
            </h2>
          </div>
          <div className="result-grid">
            <article><strong>{numberFormatter.format(applied.insertedRows)}</strong><span>Gravadas</span></article>
            <article><strong>{numberFormatter.format(summary.duplicateRows)}</strong><span>Já existiam</span></article>
            <article><strong>{numberFormatter.format(applied.replacedRows)}</strong><span>Substituídas</span></article>
            <article><strong>{numberFormatter.format(summary.errorRows)}</strong><span>Erros</span></article>
          </div>
          <p className="action-feedback success">
            Os filtros e totais abaixo já incluem este arquivo.
          </p>
        </section>
      )}
    </div>
  );
}
