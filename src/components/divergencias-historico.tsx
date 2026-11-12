"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DivergenciasCompare } from "@/components/divergencias-compare";
import { listAnalyses, removeAnalysisOnline } from "@/lib/divergencias-api";
import { buildHistoricoCsv } from "@/lib/divergencias-export";
import type { SavedAnalysis } from "@/lib/divergencias-storage";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function DivergenciasHistorico() {
  const [records, setRecords] = useState<SavedAnalysis[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    listAnalyses(true).then((res) => {
      if ("error" in res) setError(res.error);
      else setRecords(res);
    });
  }, []);

  function baixar(nomeArquivo: string, conteudo: string, tipo: string) {
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onExportJson() {
    if (!records) return;
    baixar("divergencias-historico.json", JSON.stringify(records, null, 2), "application/json");
    setFeedback("Arquivo divergencias-historico.json baixado. É o backup completo das análises salvas da organização.");
  }

  function onExportCsv() {
    if (!records) return;
    baixar("divergencias-historico.csv", "\uFEFF" + buildHistoricoCsv(records), "text/csv;charset=utf-8");
    setFeedback(
      "Arquivo divergencias-historico.csv baixado: uma linha por produto por análise, para conferir em planilha. Só entram os números já salvos, sem cálculo novo. O JSON continua sendo o backup completo.",
    );
  }

  async function onRemove(id: string) {
    setFeedback(null);
    const res = await removeAnalysisOnline(id);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setError(null);
    setRecords((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
  }

  return (
    <>
      <section className="panel" aria-labelledby="lista-titulo">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Banco da organização</span>
            <h2 id="lista-titulo">Análises salvas</h2>
          </div>
          {records && <span className="status-pill">{records.length} análises salvas</span>}
        </div>
        {error && (
          <div className="callout is-danger" role="alert">
            <strong>Histórico indisponível</strong>
            <p>{error}</p>
          </div>
        )}
        {records === null && !error ? (
          <p className="panel-note">Carregando análises salvas...</p>
        ) : records !== null && records.length === 0 ? (
          <p className="panel-note">
            Nenhuma análise salva ainda. Na página de <Link href="/divergencias" className="inline-link">Análise</Link>,
            importe um CSV e use o botão &quot;Salvar análise no histórico&quot;.
          </p>
        ) : records !== null ? (
          <>
            <div className="import-actions">
              <button type="button" className="secondary-action" onClick={onExportCsv}>
                Exportar histórico (CSV)
              </button>
              <button type="button" className="secondary-action" onClick={onExportJson}>
                Exportar histórico (JSON)
              </button>
            </div>
            <ul className="history-list">
              {records.map((r) => (
                <li key={r.id} className="history-item">
                  <div>
                    <strong>{r.name}</strong>
                    <small>
                      {r.inventoryDate ? `Inventário de ${r.inventoryDate} · ` : ""}
                      Salva em {formatDate(r.savedAt)} · {r.productCount} produtos
                    </small>
                  </div>
                  <div className="history-actions">
                    <button type="button" className="secondary-action" onClick={() => onRemove(r.id)}>
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {feedback && (
          <div className="callout" role="status">
            <strong>Pronto</strong>
            <p>{feedback}</p>
          </div>
        )}
        <p className="panel-note">
          Estas análises ficam no banco do Inventara, separadas por organização: só quem entra na sua organização
          consegue ver ou apagar. As análises antigas do site separado de divergências não foram migradas e continuam lá.
        </p>
      </section>

      <section className="panel" aria-labelledby="comparar-titulo">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Recorrência</span>
            <h2 id="comparar-titulo">Comparar dois inventários</h2>
          </div>
        </div>
        <p>
          Escolha duas análises salvas, por exemplo o mesmo setor contado em duas datas diferentes. O foco é a
          repetição da própria divergência: o mesmo produto faltando ou sobrando em quantidades parecidas nas duas
          contagens, o que ajuda a achar possíveis furos e erros para investigar. Mais abaixo, a variação de
          estoque contado entre as datas fica separada.
        </p>
        <div className="callout is-warning" role="note">
          <strong>Variação entre datas não é prova de perda</strong>
          <p>
            Uma mudança de estoque entre dois dias, sozinha, não prova perda nem ganho: vendas e entradas acontecem
            no meio do caminho e não aparecem nesses dois relatórios. Use a variação como ponto de partida para
            conferir movimentações.
          </p>
        </div>
        {records !== null && (
          <DivergenciasCompare
            records={records}
            emptyNote="Salve pelo menos duas análises para comparar períodos diferentes."
          />
        )}
      </section>
    </>
  );
}
