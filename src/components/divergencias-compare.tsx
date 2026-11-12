"use client";

import { useState } from "react";
import { comparar, ordenarPorData, type Comparacao } from "@/lib/comparacao";
import { fmt, fmtSigned } from "@/lib/divergencias";
import type { SavedAnalysis } from "@/lib/divergencias-storage";

function label(r: SavedAnalysis): string {
  return `${r.inventoryDate ? `Inventário ${r.inventoryDate} · ` : ""}${r.name}`;
}

/**
 * Quanto os dois arquivos se sobrepõem. A comparação casa produtos pelo código
 * de barras, então setores diferentes produzem um resultado vazio sem explicar
 * por quê; este aviso torna a sobreposição explícita antes das listas.
 */
function SobreposicaoAviso({ cmp }: { cmp: Comparacao }) {
  const { comuns, totalA, totalB } = cmp.sobreposicao;
  const base = Math.max(totalA, totalB, 1);
  const pct = Math.round((comuns / base) * 100);
  const resumo = `${comuns} de ${base} produtos aparecem nos dois arquivos (${pct}%): ${totalA} em A, ${totalB} em B.`;
  if (comuns === 0) {
    return (
      <div className="callout is-danger" role="alert">
        <strong>Nenhum produto em comum</strong>
        <p>
          {resumo} Nenhum código de barras aparece nas duas análises, então não há recorrência para medir. Os dois
          arquivos parecem ser de setores ou grupos diferentes: para comparar períodos, salve o mesmo setor em
          duas datas.
        </p>
      </div>
    );
  }
  if (pct < 50) {
    return (
      <div className="callout is-warning" role="note">
        <strong>Poucos produtos em comum</strong>
        <p>
          {resumo} A comparação e a recorrência consideram só os produtos presentes nos dois arquivos. Se os
          inventários eram para cobrir o mesmo setor, confira se os CSVs são do mesmo grupo de produtos.
        </p>
      </div>
    );
  }
  return <p className="panel-note">{resumo} A comparação e a recorrência consideram só esses produtos em comum.</p>;
}

export function DivergenciasCompare({ records, emptyNote }: { records: SavedAnalysis[]; emptyNote: React.ReactNode }) {
  const [selA, setSelA] = useState("");
  const [selB, setSelB] = useState("");
  const [resultado, setResultado] = useState<{ a: SavedAnalysis; b: SavedAnalysis; cmp: Comparacao; trocou: boolean; datasValidas: boolean } | null>(null);
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
    const ord = ordenarPorData(ra, rb);
    setResultado({ a: ord.a, b: ord.b, cmp: comparar(ord.a.dataset, ord.b.dataset), trocou: ord.trocou, datasValidas: ord.datasValidas });
  }

  if (records.length < 2) {
    return <p className="panel-note">{emptyNote}</p>;
  }

  return (
    <>
      <div className="compare-grid">
        <label>
          <span>Inventário A</span>
          <select value={selA} onChange={(e) => setSelA(e.target.value)}>
            <option value="">Escolher...</option>
            {records.map((r) => (
              <option key={r.id} value={r.id}>{label(r)}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Inventário B</span>
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
      <p className="panel-note">
        A é o inventário mais antigo e B o mais recente. Quando as duas análises têm data do inventário válida, a
        ordem é ajustada automaticamente; sem data válida, vale a ordem escolhida aqui.
      </p>
      {compareError && (
        <div className="callout is-danger" role="alert">
          <strong>Não deu para comparar</strong>
          <p>{compareError}</p>
        </div>
      )}
      {resultado && (
        <>
          {resultado.trocou && (
            <p className="panel-note">
              Ordem ajustada pela data do inventário: A = {label(resultado.a)} (mais antigo) e B = {label(resultado.b)} (mais recente).
            </p>
          )}
          {!resultado.datasValidas && (
            <p className="panel-note">
              Pelo menos uma das análises está sem data do inventário válida, então a ordem A/B ficou como você
              escolheu. Confira se A é mesmo a contagem mais antiga.
            </p>
          )}
          <SobreposicaoAviso cmp={resultado.cmp} />
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
