"use client";

import { useState } from "react";
import { comparar, type Comparacao } from "@/lib/comparacao";
import { fmt, fmtSigned } from "@/lib/divergencias";
import type { SavedAnalysis } from "@/lib/divergencias-storage";

function label(r: SavedAnalysis): string {
  return `${r.inventoryDate ? `Inventário ${r.inventoryDate} · ` : ""}${r.name}`;
}

export function DivergenciasCompare({ records, emptyNote }: { records: SavedAnalysis[]; emptyNote: React.ReactNode }) {
  const [selA, setSelA] = useState("");
  const [selB, setSelB] = useState("");
  const [resultado, setResultado] = useState<{ a: SavedAnalysis; b: SavedAnalysis; cmp: Comparacao } | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  function onCompare() {
    const ra = records.find((r) => r.id === selA);
    const rb = records.find((r) => r.id === selB);
    if (!ra || !rb) {
      setCompareError("Escolha duas análises salvas para comparar.");
      setResultado(null);
      return;
    }
    if (ra.id === rb.id) {
      setCompareError("Escolha duas análises diferentes: comparar um inventário com ele mesmo não mostra variação.");
      setResultado(null);
      return;
    }
    if (!ra.dataset || !rb.dataset) {
      setCompareError("Uma das análises escolhidas não carregou por completo. Tente de novo.");
      setResultado(null);
      return;
    }
    setCompareError(null);
    setResultado({ a: ra, b: rb, cmp: comparar(ra.dataset, rb.dataset) });
  }

  if (records.length < 2) {
    return <p className="panel-note">{emptyNote}</p>;
  }

  return (
    <>
      <div className="compare-grid">
        <label>
          <span>Inventário A (mais antigo)</span>
          <select value={selA} onChange={(e) => setSelA(e.target.value)}>
            <option value="">Escolher...</option>
            {records.map((r) => (
              <option key={r.id} value={r.id}>{label(r)}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Inventário B (mais recente)</span>
          <select value={selB} onChange={(e) => setSelB(e.target.value)}>
            <option value="">Escolher...</option>
            {records.map((r) => (
              <option key={r.id} value={r.id}>{label(r)}</option>
            ))}
          </select>
        </label>
        <button type="button" className="primary-action" onClick={onCompare}>
          Comparar
        </button>
      </div>
      {compareError && (
        <div className="callout is-danger" role="alert">
          <strong>Não deu para comparar</strong>
          <p>{compareError}</p>
        </div>
      )}
      {resultado && (
        <>
          <h3 className="compare-heading">Padrão recorrente: faltas e sobras parecidas</h3>
          <p className="panel-note">
            Produtos com divergência no mesmo sentido e em quantidades parecidas nas duas contagens
            {resultado.a.inventoryDate && resultado.b.inventoryDate
              ? ` (${resultado.a.inventoryDate} e ${resultado.b.inventoryDate})`
              : ""}.
            Critério usado: mesmo sinal, e a menor quantidade valendo pelo menos metade da maior. É um
            critério inicial, fixo nesta versão (só muda no código). Uma repetição assim ajuda a achar possíveis furos e erros para
            investigar, mas não prova causa: confira movimentações, rótulo, PLU e unidade antes de concluir.
          </p>
          {resultado.cmp.recorrentes.length ? (
            <ul className="alert-list">
              {resultado.cmp.recorrentes.map(({ row, tipo }) => (
                <li key={row.cod} className="alert-row">
                  <span className="alert-name">{row.desc}</span>
                  <span className="alert-detail">
                    {resultado.a.inventoryDate ?? "A"}: {fmtSigned(row.divA)} · {resultado.b.inventoryDate ?? "B"}: {fmtSigned(row.divB)}
                  </span>
                  <span className="alert-value">{tipo === "falta" ? "falta recorrente" : "sobra recorrente"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-note">Nenhum produto com faltas ou sobras parecidas nas duas datas.</p>
          )}

          <h3 className="compare-heading">Divergiu nas duas datas, sem padrão claro</h3>
          <p className="panel-note">
            Divergência nas duas contagens, mas com sinal trocado ou tamanhos muito diferentes. Também vale
            conferir, sem tratar como repetição.
          </p>
          {resultado.cmp.semPadrao.length ? (
            <ul className="alert-list">
              {resultado.cmp.semPadrao.map((r) => (
                <li key={r.cod} className="alert-row">
                  <span className="alert-name">{r.desc}</span>
                  <span className="alert-detail">
                    {resultado.a.inventoryDate ?? "A"}: {fmtSigned(r.divA)} · {resultado.b.inventoryDate ?? "B"}: {fmtSigned(r.divB)}
                  </span>
                  <span className="alert-value">mudou de padrão</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-note">Nenhum neste par de inventários.</p>
          )}

          <h3 className="compare-heading">Divergiu em uma data só</h3>
          {resultado.cmp.soEmUmaData.length ? (
            <ul className="alert-list">
              {resultado.cmp.soEmUmaData.map((r) => (
                <li key={r.cod} className="alert-row">
                  <span className="alert-name">{r.desc}</span>
                  <span className="alert-detail">
                    {r.divA !== 0
                      ? `${resultado.a.inventoryDate ?? "A"}: ${fmtSigned(r.divA)} · ${resultado.b.inventoryDate ?? "B"}: sem divergência`
                      : `${resultado.a.inventoryDate ?? "A"}: sem divergência · ${resultado.b.inventoryDate ?? "B"}: ${fmtSigned(r.divB)}`}
                  </span>
                  <span className="alert-value">só em uma data</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-note">Nenhum neste par de inventários.</p>
          )}

          <h3 className="compare-heading">Variação de estoque contado entre as datas</h3>
          <p className="panel-note">
            Contado em B menos contado em A, só para produtos presentes nos dois arquivos. Vendas e entradas
            entre as datas não aparecem aqui: confira as movimentações antes de concluir qualquer coisa.
          </p>
          {resultado.cmp.comVariacaoContado.length ? (
            <ul className="alert-list">
              {resultado.cmp.comVariacaoContado.map((r) => (
                <li key={r.cod} className="alert-row">
                  <span className="alert-name">{r.desc}</span>
                  <span className="alert-detail">
                    Contado {fmt(r.contadoA)} → {fmt(r.contadoB)}
                  </span>
                  <span className="alert-value">{fmtSigned(r.difContado)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-note">Nenhuma variação de estoque contado entre as duas análises.</p>
          )}

          {(resultado.cmp.soEmA.length > 0 || resultado.cmp.soEmB.length > 0) && (
            <p className="panel-note">
              {resultado.cmp.soEmA.length} produto(s) só em A e {resultado.cmp.soEmB.length} só em B ficaram
              fora da comparação, porque não dá para comparar o que não aparece nos dois arquivos.
            </p>
          )}
        </>
      )}
    </>
  );
}
