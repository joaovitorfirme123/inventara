"use client";

import { useMemo, useState } from "react";
import { buildMultiComparison } from "@/lib/comparacao-multipla";
import { describeProducts } from "@/lib/divergencias-detalhes";
import { fmt, fmtSigned, norm } from "@/lib/divergencias";
import type { SavedAnalysis } from "@/lib/divergencias-storage";

const PAGE_SIZE = 25;
const MAX_SELECTED = 10;

export function DivergenciasMulti({ records }: { records: SavedAnalysis[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [detailed, setDetailed] = useState(false);
  const [pattern, setPattern] = useState("all");
  const [query, setQuery] = useState("");
  const [presence, setPresence] = useState("all");
  const [page, setPage] = useState(0);
  const result = useMemo(() => {
    const chosen = selected.flatMap((id) => {
      const record = records.find((r) => r.id === id);
      return record ? [record] : [];
    });
    if (chosen.length < 2) return null;
    try { return { data: buildMultiComparison(chosen), error: null }; }
    catch (error) { return { data: null, error: error instanceof Error ? error.message : "Não foi possível montar a visão." }; }
  }, [records, selected]);
  const details = useMemo(() => detailed && result?.data ? describeProducts(result.data.records) : null, [detailed, result]);
  const filtered = useMemo(() => {
    const data = result?.data;
    if (!data) return [];
    const term = norm(query.trim());
    return data.rows.filter((row) =>
      (!term || norm(`${row.cod} ${row.desc}`).includes(term)) &&
      (presence !== "common" || row.presentes === data.records.length) &&
      (presence !== "partial" || row.presentes < data.records.length) &&
      (!detailed || pattern === "all" || (() => {
        const d = details?.get(row.cod);
        if (!d) return false;
        if (pattern === "shortages") return d.shortages >= 2;
        if (pattern === "surpluses") return d.surpluses >= 2;
        if (pattern === "mixed") return d.shortages > 0 && d.surpluses > 0;
        return d.negativeFrozen > 0 || d.zeroCountWithStock > 0;
      })()));
  }, [result, query, presence, detailed, pattern, details]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const data = result?.data;

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((v) => v !== id) : prev.length < MAX_SELECTED ? [...prev, id] : prev);
    setPage(0);
  }

  return <section className="panel multi-comparison" aria-labelledby="multi-title">
    <div className="panel-heading"><div><span className="section-kicker">Visão lado a lado</span><h2 id="multi-title">Comparar vários inventários</h2></div></div>
    <p>Selecione as análises salvas para ver a divergência de cada produto em cada arquivo. Esta visão não soma divergências nem muda os critérios da comparação de dois inventários abaixo.</p>
    <fieldset className="multi-picker"><legend>Inventários para comparar (de 2 a 10)</legend>
      {records.map((r) => <label key={r.id}><input type="checkbox" checked={selected.includes(r.id)} disabled={!selected.includes(r.id) && selected.length >= MAX_SELECTED} onChange={() => toggle(r.id)} /><span><strong>{r.inventoryDate || "Sem data informada"}</strong><small>{r.name}</small></span></label>)}
    </fieldset>
    <div className="import-actions"><span role="status">{selected.filter((id) => records.some((r) => r.id === id)).length} de {MAX_SELECTED} selecionados</span><button type="button" className="secondary-action" onClick={() => { setSelected([]); setPage(0); }}>Limpar seleção</button></div>
    {selected.length >= MAX_SELECTED && <p className="panel-note" role="status">Limite de 10 inventários atingido. Desmarque um para escolher outro.</p>}
    {!result && <p className="panel-note">Selecione pelo menos duas análises. Para incluir outro CSV, importe e salve na aba Análise, como já faz hoje.</p>}
    {result?.error && <div className="callout is-danger" role="alert"><strong>Não deu para comparar</strong><p>{result.error}</p></div>}
    {data && <>
      <div className="callout is-warning" role="note"><strong>Leitura por arquivo, não prova de perda</strong><p>Cada número é a divergência registrada naquele relatório. Zero significa produto presente sem divergência. &quot;Não consta&quot; significa que o código não aparece no arquivo, não que o estoque é zero. Vendas, entradas e ajustes entre contagens não estão aqui. Confira também a unidade dos produtos.</p></div>
      <p className="panel-note">{data.allDated ? "Colunas em ordem da data do inventário, da mais antiga à mais recente." : "Há análise sem data válida: mantida a ordem de seleção, sem presumir sequência cronológica."} {data.sameDate && "Há arquivos com a mesma data: não representam necessariamente contagens em dias diferentes."}</p>
      <ol className="multi-key">{data.records.map((r, i) => <li key={r.id}><strong>Arquivo {i + 1}: {r.inventoryDate || "Sem data"}</strong> · {r.name}</li>)}</ol>
      <div className="multi-filters"><label>Buscar produto ou código<input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} /></label><label>Presença nos arquivos<select value={presence} onChange={(e) => { setPresence(e.target.value); setPage(0); }}><option value="all">Todos os produtos</option><option value="common">Presentes em todos</option><option value="partial">Ausentes em algum arquivo</option></select></label></div>
      <p className="panel-note" role="status">{filtered.length} de {data.rows.length} produtos · {data.rows.filter((r) => r.presentes === data.records.length).length} presentes em todos os arquivos. A união usa o código de barras, não a descrição.</p>
      {!data.rows.some((r) => r.presentes > 1) && <div className="callout is-warning" role="note"><strong>Nenhum produto em comum entre arquivos</strong><p>Confira se os inventários são do mesmo grupo de produtos. Nenhuma ausência foi convertida em zero.</p></div>}
      <label className="confirm-cost"><input type="checkbox" checked={detailed} onChange={(e) => { setDetailed(e.target.checked); setPage(0); }} />Abrir análise detalhada (opcional, por regras, sem IA externa)</label>
      {detailed && <><p className="panel-note">Frequências contam arquivos em que o produto consta, não dias diferentes. Faltas e sobras em arquivos diferentes indicam sinais diferentes, sem presumir causa ou ordem temporal. Os critérios anteriores de semelhança continuam só na comparação de dois inventários. Nenhuma quantidade é somada como prejuízo.</p><div className="multi-filters"><label>Destacar observações<select value={pattern} onChange={(e) => { setPattern(e.target.value); setPage(0); }}><option value="all">Todos os produtos</option><option value="shortages">Falta em pelo menos 2 arquivos</option><option value="surpluses">Sobra em pelo menos 2 arquivos</option><option value="mixed">Falta e sobra em arquivos diferentes</option><option value="alerts">Saldo negativo ou contagem zero com saldo</option></select></label></div></>}
      <p className="panel-note">No celular, deslize a tabela para os lados. A coluna de produto permanece visível.</p>
      <div className="multi-scroll" tabIndex={0} role="region" aria-label="Divergências lado a lado, tabela com rolagem horizontal">
        <table className="multi-table"><caption>Divergência por produto e arquivo selecionado</caption><thead><tr><th scope="col">Produto / código</th>{data.records.map((r, i) => <th scope="col" key={r.id}>Arquivo {i + 1}<small>{r.inventoryDate || "Sem data"}</small></th>)}</tr></thead><tbody>
          {filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((row) => <tr key={row.cod}><th scope="row">{row.desc}<small>{row.cod}</small></th>{row.values.map((value, i) => <td key={data.records[i].id}><span className={value === null ? "multi-missing" : ""}>{value === null ? "Não consta" : fmtSigned(value)}</span></td>)}</tr>)}
          {!filtered.length && <tr><td colSpan={data.records.length + 1}>Nenhum produto com estes filtros.</td></tr>}
        </tbody></table>
      </div>
      {detailed && details && <section aria-label="Observações detalhadas dos produtos desta página" className="multi-details">
        <h3>Análise detalhada dos produtos desta página</h3>
        <p className="panel-note">Abra um produto para conferir a evidência de cada arquivo. Busca, filtro e paginação acima também controlam esta lista.</p>
        {filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE).map((row) => {
          const d = details.get(row.cod)!;
          return <details key={row.cod}><summary>{row.desc} · {row.cod}<span>Falta em {d.shortages}/{d.observed} arquivos · sobra em {d.surpluses}/{d.observed}{d.shortages > 0 && d.surpluses > 0 ? " · sinais diferentes" : ""}</span></summary>
            <p>Presente em {d.observed} de {data.records.length} arquivos; não consta em {d.missing}. Sem divergência em {d.balanced} dos {d.observed} arquivos observados.</p>
            <p>Saldo congelado negativo em {d.negativeFrozen} arquivo(s). Contagem zero com saldo congelado positivo em {d.zeroCountWithStock} arquivo(s).</p>
            <ul>{data.records.map((record, index) => {
              const evidence = d.evidence.find((e) => e.analysisId === record.id);
              return <li key={record.id}><strong>Arquivo {index + 1} · {record.inventoryDate || "Sem data"} · {record.name}:</strong> {evidence ? `divergência ${fmtSigned(evidence.divergence)}; congelado ${fmt(evidence.frozen)}; contado ${fmt(evidence.counted)}${evidence.negativeFrozen ? "; saldo congelado negativo" : ""}${evidence.zeroCountWithStock ? "; contagem zero com saldo positivo" : ""}.` : "Não consta; não entrou no cálculo de frequência."}</li>;
            })}</ul>
            <p className="panel-note">O que conferir (orientação, não diagnóstico): unidade, código/PLU, recontagem física e movimentações no ERP. O CSV sozinho não identifica causa, responsável ou prejuízo.</p>
          </details>;
        })}
      </section>}
      <nav className="import-actions" aria-label="Paginação de produtos"><button type="button" className="secondary-action" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</button><span>Página {currentPage + 1} de {pages}</span><button type="button" className="secondary-action" disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}>Próxima</button></nav>
    </>}
  </section>;
}
