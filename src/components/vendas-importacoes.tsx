"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { VendasRevisao } from "@/components/vendas-revisao";
import type { SalesStagingSummary } from "@/components/vendas-revisao";

export type SalesImportItem = {
  id: string;
  filename: string;
  importedAt: string;
  status: "PENDING" | "APPLIED";
  periodStart: string | null;
  periodEnd: string | null;
  totalRows: number;
  errorRows: number;
  newRows: number;
  unmappedPlus: number;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatPeriod(start: string | null, end: string | null) {
  if (!start || !end) return "-";
  const format = (iso: string) => {
    const [year, month, day] = iso.split("-");
    return `${day}/${month}/${year}`;
  };
  return start === end ? format(start) : `${format(start)} - ${format(end)}`;
}

export function VendasImportacoes({ imports }: { imports: SalesImportItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<SalesStagingSummary | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function openReview(item: SalesImportItem) {
    setBusyId(item.id);
    setFeedback(null);

    try {
      const response = await fetch(`/api/vendas/importacoes/${encodeURIComponent(item.id)}`);
      const payload = (await response.json().catch(() => null)) as
        | (SalesStagingSummary & { error?: string })
        | null;

      if (!response.ok || !payload || "error" in payload) {
        setFeedback({ kind: "error", text: payload?.error ?? "Não foi possível abrir a revisão." });
      } else {
        setReviewing(payload);
      }
    } catch {
      setFeedback({ kind: "error", text: "Falha de conexão. Tente novamente." });
    } finally {
      setBusyId(null);
    }
  }

  async function removeImport(item: SalesImportItem) {
    // Dois cliques: o primeiro arma a confirmação, o segundo executa.
    // Evita window.confirm, que bloqueia a aba e não funciona bem em todo navegador.
    if (confirmingId !== item.id) {
      setConfirmingId(item.id);
      setFeedback({
        kind: "error",
        text:
          item.status === "PENDING"
            ? `Clique em "Confirmar" para descartar a revisão de "${item.filename}". Nada foi gravado ainda.`
            : `Clique em "Confirmar" para excluir a importação "${item.filename}". As linhas de venda gravadas por ela serão removidas. O cadastro de produtos e os inventários não são alterados.`,
      });
      return;
    }

    setConfirmingId(null);
    setBusyId(item.id);
    setFeedback(null);

    try {
      const response = await fetch(`/api/vendas/importacoes/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setFeedback({ kind: "error", text: payload?.error ?? "Não foi possível excluir." });
      } else {
        setFeedback({
          kind: "success",
          text: item.status === "PENDING" ? "Revisão descartada." : `Importação "${item.filename}" excluída.`,
        });
        if (reviewing?.importId === item.id) setReviewing(null);
        router.refresh();
      }
    } catch {
      setFeedback({ kind: "error", text: "Falha de conexão ao excluir. Tente novamente." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="import-history panel">
      <div className="history-heading">
        <div>
          <span className="section-kicker">Auditoria</span>
          <h2>Importações de vendas</h2>
        </div>
        <span>Últimos 20 arquivos</span>
      </div>

      {reviewing && (
        <VendasRevisao
          summary={reviewing}
          onApplied={() => {
            setReviewing(null);
            setFeedback({ kind: "success", text: "Vendas gravadas." });
            router.refresh();
          }}
          onDiscarded={() => {
            setReviewing(null);
            setFeedback({ kind: "success", text: "Revisão descartada." });
            router.refresh();
          }}
        />
      )}

      <div className="history-table">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Arquivo</th>
              <th>Período</th>
              <th>Status</th>
              <th>Linhas</th>
              <th>Erros</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {imports.map((item) => (
              <tr key={item.id}>
                <td>{dateTimeFormatter.format(new Date(item.importedAt))}</td>
                <td><strong>{item.filename}</strong></td>
                <td>{formatPeriod(item.periodStart, item.periodEnd)}</td>
                <td>{item.status === "PENDING" ? "Aguardando revisão" : "Gravado"}</td>
                <td>{numberFormatter.format(item.totalRows)}</td>
                <td>{numberFormatter.format(item.errorRows)}</td>
                <td>
                  {item.status === "PENDING" && (
                    <button
                      className="compact-action primary-action"
                      disabled={busyId === item.id}
                      onClick={() => void openReview(item)}
                      type="button"
                    >
                      {busyId === item.id ? "Abrindo..." : "Revisar"}
                    </button>
                  )}{" "}
                  <button
                    className="compact-action secondary-action"
                    disabled={busyId === item.id}
                    onClick={() => void removeImport(item)}
                    type="button"
                  >
                    {busyId === item.id
                      ? "Excluindo..."
                      : confirmingId === item.id
                        ? "Confirmar"
                        : item.status === "PENDING"
                          ? "Descartar"
                          : "Excluir"}
                  </button>
                  {confirmingId === item.id && (
                    <button
                      className="compact-action secondary-action"
                      disabled={busyId === item.id}
                      onClick={() => {
                        setConfirmingId(null);
                        setFeedback(null);
                      }}
                      type="button"
                    >
                      Voltar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {feedback && (
        <p className={feedback.kind === "error" ? "action-feedback error" : "action-feedback success"} role="status">
          {feedback.text}
        </p>
      )}
    </section>
  );
}
