"use client";

import { useState } from "react";

export type SalesStagingSummary = {
  importId: string;
  totalRows: number;
  errorRows: number;
  newRows: number;
  duplicateRows: number;
  conflictingRows: number;
  conflictValue: number;
  unmappedPlus: number;
  periodStart: string | null;
  periodEnd: string | null;
  stores: string[];
  errors?: Array<{ row: number; message: string }>;
};

export type SalesApplyResult = {
  insertedRows: number;
  replacedRows: number;
  periodStart: string | null;
  periodEnd: string | null;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatSalesPeriod(start: string | null, end: string | null) {
  if (!start || !end) return "período não identificado";
  const format = (iso: string) => {
    const [year, month, day] = iso.split("-");
    return `${day}/${month}/${year}`;
  };
  return start === end ? format(start) : `${format(start)} a ${format(end)}`;
}

export function VendasRevisao({
  summary,
  onApplied,
  onDiscarded,
}: {
  summary: SalesStagingSummary;
  onApplied: (result: SalesApplyResult) => void;
  onDiscarded: () => void;
}) {
  const [busy, setBusy] = useState<"ADD" | "REPLACE" | "DISCARD" | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [message, setMessage] = useState("");

  async function apply(mode: "ADD" | "REPLACE") {
    if (mode === "REPLACE" && !confirmReplace) {
      // Dois cliques em vez de window.confirm, que bloqueia a aba em alguns navegadores.
      setConfirmReplace(true);
      setMessage(
        `Substituir o recorte apaga ${numberFormatter.format(summary.conflictingRows)} linhas já gravadas (${currencyFormatter.format(summary.conflictValue)}) que não estão neste arquivo. As vendas do arquivo entram no lugar. Clique em "Confirmar substituição" para executar.`,
      );
      return;
    }

    setBusy(mode);
    setMessage("");

    try {
      const response = await fetch(`/api/vendas/importacoes/${encodeURIComponent(summary.importId)}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const payload = (await response.json().catch(() => null)) as
        | (Partial<SalesApplyResult> & { error?: string })
        | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "Não foi possível gravar as vendas.");
        setBusy(null);
        setConfirmReplace(false);
        return;
      }

      onApplied(payload as SalesApplyResult);
    } catch {
      setMessage("Falha de conexão ao gravar. Tente novamente.");
      setBusy(null);
    }
  }

  async function discard() {
    setBusy("DISCARD");
    setMessage("");

    try {
      const response = await fetch(`/api/vendas/importacoes/${encodeURIComponent(summary.importId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(payload?.error ?? "Não foi possível descartar.");
        setBusy(null);
        return;
      }

      onDiscarded();
    } catch {
      setMessage("Falha de conexão ao descartar. Tente novamente.");
      setBusy(null);
    }
  }

  const period = formatSalesPeriod(summary.periodStart, summary.periodEnd);

  return (
    <section className="import-preview panel" aria-live="polite">
      <div className="panel-heading">
        <div>
          <span className="section-kicker">02 / Revisão</span>
          <h2>Revise antes de gravar</h2>
        </div>
      </div>

      <div className="result-grid">
        <article><strong>{numberFormatter.format(summary.newRows)}</strong><span>Linhas novas</span></article>
        <article><strong>{numberFormatter.format(summary.duplicateRows)}</strong><span>Já gravadas</span></article>
        <article><strong>{numberFormatter.format(summary.conflictingRows)}</strong><span>Só no Inventara</span></article>
        <article><strong>{numberFormatter.format(summary.errorRows)}</strong><span>Erros de leitura</span></article>
      </div>

      <p>
        Período do arquivo: <strong>{period}</strong>
        {summary.stores.length > 0 ? ` · Loja ${summary.stores.join(", ")}` : ""}.
      </p>

      {summary.conflictingRows > 0 && (
        <p className="import-error" role="alert">
          Atenção: no mesmo período e loja já existem {numberFormatter.format(summary.conflictingRows)}{" "}
          linhas gravadas ({currencyFormatter.format(summary.conflictValue)}) que NÃO estão neste arquivo.
          Isso é normal quando o arquivo cobre só parte das seções (por exemplo, só bebidas). Nesse caso,
          use &quot;Gravar linhas novas&quot;. Use &quot;Substituir recorte&quot; somente se este arquivo
          for a versão completa e corrigida desse período e loja.
        </p>
      )}

      {summary.unmappedPlus > 0 && (
        <p className="action-feedback">
          {numberFormatter.format(summary.unmappedPlus)}{" "}
          {summary.unmappedPlus === 1 ? "PLU vendido não está" : "PLUs vendidos não estão"} no cadastro
          de produtos e {summary.unmappedPlus === 1 ? "aparecerá" : "aparecerão"} como
          &quot;Sem cadastro&quot;. Atualize o cadastro na aba Importações quando puder.
        </p>
      )}

      {summary.errors && summary.errors.length > 0 && (
        <div className="result-errors">
          <strong>{summary.errors.length} linhas ignoradas na leitura</strong>
          {summary.errors.slice(0, 5).map((error) => (
            <p key={`${error.row}-${error.message}`}>
              Linha {error.row}: {error.message}
            </p>
          ))}
        </div>
      )}

      <div className="confirm-row">
        <button
          className="primary-action"
          disabled={busy !== null || summary.newRows === 0}
          onClick={() => void apply("ADD")}
          type="button"
        >
          {busy === "ADD" ? "Gravando..." : `Gravar ${numberFormatter.format(summary.newRows)} linhas novas`}
        </button>
        {summary.conflictingRows > 0 && (
          <button
            className="secondary-action"
            disabled={busy !== null}
            onClick={() => void apply("REPLACE")}
            type="button"
          >
            {busy === "REPLACE"
              ? "Substituindo..."
              : confirmReplace
                ? "Confirmar substituição"
                : "Substituir recorte pelo arquivo"}
          </button>
        )}
        <button
          className="secondary-action"
          disabled={busy !== null}
          onClick={() => void discard()}
          type="button"
        >
          {busy === "DISCARD" ? "Descartando..." : "Descartar arquivo"}
        </button>
      </div>

      {summary.newRows === 0 && (
        <p className="action-feedback">Todas as linhas deste arquivo já estão gravadas; nada a gravar.</p>
      )}

      {message && <p className="import-error" role="alert">{message}</p>}
    </section>
  );
}
