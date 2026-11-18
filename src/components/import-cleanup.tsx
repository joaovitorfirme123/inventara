"use client";

import { useCallback, useEffect, useState } from "react";

type SnapshotPreview = {
  apagaveis: number;
  mantidas: number;
  tamanhoAtualTabela: string;
  garantia: string;
};

type AuditPreview = {
  corte: string;
  apagaveis: number;
  importacoesAfetadas: number;
  tamanhoAtualTabela: string;
};

const numberFormatter = new Intl.NumberFormat("pt-BR");
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" });

export function ImportCleanup({ canManage }: { canManage: boolean }) {
  const [snapshots, setSnapshots] = useState<SnapshotPreview | null>(null);
  const [auditoria, setAuditoria] = useState<AuditPreview | null>(null);
  const [corte, setCorte] = useState("");
  const [trimSnapshots, setTrimSnapshots] = useState(true);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const loadSnapshots = useCallback(async () => {
    const response = await fetch("/api/importacoes/limpeza");
    if (response.ok) {
      const data = await response.json();
      setSnapshots(data.snapshots);
    }
  }, []);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  async function previewAuditoria(data: string) {
    setCorte(data);
    setAuditoria(null);
    if (!data) return;
    const response = await fetch(`/api/importacoes/limpeza?auditBefore=${encodeURIComponent(data)}`);
    if (response.ok) {
      const body = await response.json();
      setAuditoria(body.auditoria);
    }
  }

  const temAlgoParaLimpar =
    (trimSnapshots && (snapshots?.apagaveis ?? 0) > 0) || (auditoria && auditoria.apagaveis > 0);

  async function executar() {
    setLoading(true);
    setErro(null);
    setResultado(null);
    try {
      const response = await fetch("/api/importacoes/limpeza", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: true,
          scope: {
            trimSnapshots,
            auditBefore: auditoria && corte ? new Date(corte).toISOString() : null,
          },
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setErro(body.error ?? "Falha ao executar a limpeza.");
      } else {
        setResultado(
          `Removidos ${numberFormatter.format(body.snapshotsRemovidos)} registros de histórico de estoque e ${numberFormatter.format(body.auditoriaRemovida)} linhas de auditoria. ${body.aviso}`,
        );
        setConfirming(false);
        setAuditoria(null);
        setCorte("");
        await loadSnapshots();
      }
    } catch {
      setErro("Falha de rede ao executar a limpeza.");
    } finally {
      setLoading(false);
    }
  }

  if (!canManage) return null;

  return (
    <section className="import-history panel">
      <div className="history-heading">
        <div>
          <span className="section-kicker">Manutenção</span>
          <h2>Limpeza do histórico antigo</h2>
        </div>
      </div>

      <p>
        Libera espaço no banco sem tocar em produtos, estoques atuais nem inventários. Revise o
        que sai e o que fica antes de confirmar. A exclusão é definitiva.
      </p>

      <div>
        <label>
          <input
            type="checkbox"
            checked={trimSnapshots}
            onChange={(event) => setTrimSnapshots(event.target.checked)}
          />{" "}
          Histórico de estoque: manter só os 2 registros mais recentes de cada produto.
        </label>
        {snapshots && (
          <p>
            Sairiam {numberFormatter.format(snapshots.apagaveis)} registros e ficariam{" "}
            {numberFormatter.format(snapshots.mantidas)}. A posição de estoque (atual, anterior e
            variação) de todos os produtos não muda. O histórico por produto passa a ter no máximo
            2 pontos.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="corte-auditoria">
          Detalhe linha a linha das importações: apagar registros anteriores a
        </label>{" "}
        <input
          id="corte-auditoria"
          type="date"
          value={corte}
          onChange={(event) => previewAuditoria(event.target.value)}
        />
        {auditoria && (
          <p>
            Sairiam {numberFormatter.format(auditoria.apagaveis)} linhas de{" "}
            {numberFormatter.format(auditoria.importacoesAfetadas)} importações anteriores a{" "}
            {dateFormatter.format(new Date(auditoria.corte))}. As importações continuam listadas
            com nome, data e contagens, mas o detalhe por linha delas deixa de existir.
          </p>
        )}
      </div>

      {resultado && <p role="status">{resultado}</p>}
      {erro && <p role="alert">{erro}</p>}

      {!confirming ? (
        <button type="button" disabled={!temAlgoParaLimpar || loading} onClick={() => setConfirming(true)}>
          Revisar limpeza
        </button>
      ) : (
        <div role="alertdialog" aria-label="Confirmar limpeza">
          <p>
            <strong>Confirma a exclusão definitiva?</strong>{" "}
            {trimSnapshots && snapshots && snapshots.apagaveis > 0
              ? `${numberFormatter.format(snapshots.apagaveis)} registros de histórico de estoque. `
              : ""}
            {auditoria && auditoria.apagaveis > 0
              ? `${numberFormatter.format(auditoria.apagaveis)} linhas de auditoria de importações anteriores a ${dateFormatter.format(new Date(auditoria.corte))}.`
              : ""}
          </p>
          <button type="button" disabled={loading} onClick={executar}>
            {loading ? "Limpando..." : "Confirmar limpeza"}
          </button>{" "}
          <button type="button" disabled={loading} onClick={() => setConfirming(false)}>
            Voltar
          </button>
        </div>
      )}
    </section>
  );
}
