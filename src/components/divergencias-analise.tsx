"use client";

import { useMemo, useRef, useState } from "react";
import {
  analyze,
  fmt,
  fmtSigned,
  money,
  norm,
  parseCsv,
  valueOf,
  type Dataset,
  type Item,
} from "@/lib/divergencias";
import { SAMPLE_ITEMS, SAMPLE_NAME } from "@/lib/divergencias-amostra";
import { inventoryDateError } from "@/lib/inventory-date";
import { saveAnalysisOnline } from "@/lib/divergencias-api";

const sampleDataset: Dataset = {
  name: SAMPLE_NAME,
  items: SAMPLE_ITEMS,
  warnings: [],
};

function AlertRows({
  items,
  render,
  limit = 6,
}: {
  items: Item[];
  render: (i: Item) => React.ReactNode;
  limit?: number;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, limit);
  return (
    <>
      <ul className="alert-list">{shown.map(render)}</ul>
      {items.length > limit && (
        <button type="button" className="secondary-action" onClick={() => setAll(!all)}>
          {all ? "Mostrar menos" : `Ver todos os ${items.length}`}
        </button>
      )}
    </>
  );
}

export function DivergenciasAnalise() {
  const [dataset, setDataset] = useState<Dataset>(sampleDataset);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [costConfirmed, setCostConfirmed] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [onlineFeedback, setOnlineFeedback] = useState<string | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineBusy, setOnlineBusy] = useState(false);
  const [inventoryDate, setInventoryDate] = useState("");
  // A tela abre na amostra sintética de demonstração, que não pode ser salva.
  const [isSample, setIsSample] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const a = useMemo(() => analyze(dataset.items), [dataset]);
  const filtered = dataset.items.filter((i) => norm(`${i.desc} ${i.cod} ${i.plu ?? ""}`).includes(norm(query)));
  const valued = dataset.items.filter((i) => i.custoMedio != null && i.custoMedio >= 0);
  const financeTop = [...valued]
    .filter((i) => i.div !== 0)
    .sort((x, y) => Math.abs(valueOf(y)) - Math.abs(valueOf(x)))
    .slice(0, 10);
  const hasExtra = dataset.items.some((i) => i.plu || i.emb || i.custoMedio != null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseCsv(String(reader.result ?? ""));
      if ("error" in result) {
        setParseError(result.error);
      } else {
        setParseError(null);
        setOnlineFeedback(null);
        setOnlineError(null);
        setQuery("");
        setShowAll(false);
        setCostConfirmed(false);
        setIsSample(false);
        setDataset({ name: `${file.name} (${result.items.length} produtos)`, items: result.items, warnings: result.warnings });
      }
    };
    reader.onerror = () => setParseError("Não consegui abrir este arquivo. Tente exportar o relatório de novo.");
    reader.readAsText(file, "ISO-8859-1");
  }

  return (
    <>
      <section className="panel import-panel" aria-labelledby="importar-titulo">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Arquivo</span>
            <h2 id="importar-titulo">Importar relatório</h2>
          </div>
          <span className="status-pill">{dataset.items.length} produtos</span>
        </div>
        <label className="import-zone">
          <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={onFile} aria-label="Escolher arquivo CSV" />
          <strong>Escolher CSV de divergências</strong>
          <small>Separado por ponto e vírgula, como sai do ERP</small>
        </label>
        <p className="panel-note">
          Analisando agora: {dataset.name}. O arquivo é lido apenas neste navegador e substitui a análise exibida,
          sem juntar inventários. Nada é enviado ao ERP, e ao banco do Inventara só vai a análise que você escolher
          salvar. Ao recarregar a página, volta a amostra sintética de demonstração.
        </p>
        <div className="import-actions">
          <label className="date-label">
            <span>Data do inventário (opcional)</span>
            <input
              type="text"
              value={inventoryDate}
              onChange={(e) => setInventoryDate(e.target.value)}
              placeholder="Ex.: 09/11/2026"
              aria-label="Data do inventário"
            />
          </label>
          <button
            type="button"
            className="secondary-action"
            disabled={onlineBusy || isSample}
            title={isSample ? "A amostra de demonstração não pode ser salva" : undefined}
            onClick={async () => {
              const dateProblem = inventoryDateError(inventoryDate);
              if (dateProblem) {
                setOnlineFeedback(null);
                setOnlineError(dateProblem);
                return;
              }
              setOnlineBusy(true);
              setOnlineError(null);
              setOnlineFeedback(null);
              const res = await saveAnalysisOnline(dataset, inventoryDate);
              setOnlineBusy(false);
              if ("error" in res) {
                setOnlineError(res.error);
                return;
              }
              setOnlineFeedback("Análise salva no histórico da organização. Na aba Histórico, dentro de Divergências, dá para comparar inventários de datas diferentes e exportar em JSON.");
            }}
          >
            {onlineBusy ? "Salvando..." : "Salvar análise no histórico"}
          </button>
        </div>
        {isSample && (
          <p className="panel-note">
            A amostra de demonstração é só para explorar a tela e não pode ser salva no histórico. Importe um CSV
            do ERP para liberar o botão de salvar.
          </p>
        )}
        {onlineFeedback && (
          <div className="callout" role="status">
            <strong>Salvo no histórico</strong>
            <p>{onlineFeedback}</p>
          </div>
        )}
        {onlineError && (
          <div className="callout is-danger" role="alert">
            <strong>Não salvei</strong>
            <p>{onlineError}</p>
          </div>
        )}
        {parseError && (
          <div className="callout is-danger" role="alert">
            <strong>Não consegui ler o arquivo</strong>
            <p>{parseError}</p>
          </div>
        )}
        {dataset.warnings.map((w, i) => (
          <div key={i} className="callout is-warning" role="status">
            <strong>Atenção na leitura</strong>
            <p>{w}</p>
          </div>
        ))}
      </section>

      <section aria-label="Resumo" className="metric-grid">
        <article className="metric-card">
          <span className="metric-index">01</span>
          <p>Produtos no arquivo</p>
          <strong>{dataset.items.length}</strong>
          <small>linhas de produto legíveis</small>
        </article>
        <article className="metric-card">
          <span className="metric-index">02</span>
          <p>Saldo congelado negativo</p>
          <strong>{a.negCong.length}</strong>
          <small>padrão 1</small>
        </article>
        <article className="metric-card">
          <span className="metric-index">03</span>
          <p>Contagem zero com saldo</p>
          <strong>{a.zeroCount.length}</strong>
          <small>padrão 3</small>
        </article>
        <article className="metric-card">
          <span className="metric-index">04</span>
          <p>Estoque atual negativo</p>
          <strong>{a.negAtual.length}</strong>
          <small>padrão 4</small>
        </article>
        <article className="metric-card">
          <span className="metric-index">05</span>
          <p>Pares com sinais opostos</p>
          <strong>{a.pairs.length}</strong>
          <small>padrão 2</small>
        </article>
        <article className="metric-card">
          <span className="metric-index">06</span>
          <p>Sem divergência</p>
          <strong>{a.ok}</strong>
          <small>contado = congelado</small>
        </article>
      </section>

      <section className="panel" aria-labelledby="padrao1-titulo">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Padrão 1</span>
            <h2 id="padrao1-titulo">Saldo congelado negativo</h2>
          </div>
        </div>
        <p>
          Estes produtos tinham saldo congelado negativo no relatório. Isso distorce a divergência: a diferença
          positiva pode vir só da correção desse saldo, mas também pode haver sobra física. O CSV sozinho não separa
          as causas. Possibilidades a conferir nas movimentações, sem conclusão neste relatório:
        </p>
        <ul className="hint-list">
          <li>Nota de entrada lançada fora de ordem em relação à venda</li>
          <li>Venda feita sem o lançamento da nota de entrada</li>
          <li>Código (PLU) trocado na hora da venda</li>
        </ul>
        {a.negCong.length ? (
          <AlertRows
            items={a.negCong}
            render={(i) => (
              <li key={i.cod} className="alert-row">
                <span className="alert-name">{i.desc}</span>
                <span className="alert-detail">Congelado {fmt(i.cong)} → contado {fmt(i.inv)}</span>
                <span className="alert-value">{fmtSigned(i.div)}</span>
              </li>
            )}
          />
        ) : (
          <p className="panel-note">Nenhum neste arquivo.</p>
        )}
      </section>

      <section className="panel" aria-labelledby="padrao2-titulo">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Padrão 2</span>
            <h2 id="padrao2-titulo">Produtos parecidos, divergências opostas</h2>
          </div>
        </div>
        <p>
          Candidatos agrupados pela primeira palavra relevante da descrição (três palavras para descrições que
          começam com CREME) e por diferenças de sinais opostos, com valores numéricos de tamanho próximo. A busca é
          textual: não confirma equivalência de produto nem de unidade. Compare rótulo, PLU, unidade e movimentações
          antes de investigar possível troca de código; os pares não provam compensação.
        </p>
        {a.pairs.length ? (
          <>
            <ul className="alert-list">
              {a.pairs.slice(0, 12).map((p) => (
                <li key={p.a.cod + ":" + p.b.cod} className="alert-row">
                  <span className="alert-name">{p.a.desc} × {p.b.desc}</span>
                  <span className="alert-detail">Um com {fmtSigned(p.a.div)} e o outro com {fmtSigned(p.b.div)}</span>
                </li>
              ))}
            </ul>
            {a.pairs.length > 12 && (
              <p className="panel-note">
                Exibindo os primeiros 12 de {a.pairs.length} candidatos, na ordem do arquivo. Não é uma lista de
                prioridade.
              </p>
            )}
          </>
        ) : (
          <p className="panel-note">Nenhum neste arquivo.</p>
        )}
      </section>

      <section className="panel" aria-labelledby="padrao3-titulo">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Padrão 3</span>
            <h2 id="padrao3-titulo">Contagem zero com saldo no sistema</h2>
          </div>
        </div>
        <p>
          O sistema tinha saldo e a contagem registrou zero. Pode ser ruptura real ou item que ficou de fora da
          contagem. O zero sozinho não prova nenhuma das duas: confira no local.
        </p>
        {a.zeroCount.length ? (
          <AlertRows
            items={a.zeroCount}
            render={(i) => (
              <li key={i.cod} className="alert-row">
                <span className="alert-name">{i.desc}</span>
                <span className="alert-detail">Sistema marcava {fmt(i.cong)} → contado 0</span>
                <span className="alert-value">{fmtSigned(i.div)}</span>
              </li>
            )}
          />
        ) : (
          <p className="panel-note">Nenhum neste arquivo.</p>
        )}
      </section>

      <section className="panel" aria-labelledby="padrao4-titulo">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Padrão 4</span>
            <h2 id="padrao4-titulo">Estoque atual negativo no relatório</h2>
          </div>
        </div>
        <p>
          O campo de estoque atual está negativo nestes produtos. Confira a data de referência do relatório e as
          movimentações de cada item; o CSV isolado não explica a causa.
        </p>
        {a.negAtual.length ? (
          <AlertRows
            items={a.negAtual}
            render={(i) => (
              <li key={i.cod} className="alert-row">
                <span className="alert-name">{i.desc}</span>
                <span className="alert-detail">Estoque atual no relatório: {fmt(i.atual)}</span>
              </li>
            )}
          />
        ) : (
          <p className="panel-note">Nenhum neste arquivo.</p>
        )}
      </section>

      <section className="panel" aria-labelledby="ranking-titulo">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Ranking</span>
            <h2 id="ranking-titulo">Maiores divergências numéricas</h2>
          </div>
        </div>
        <p>
          As dez maiores diferenças em valor absoluto, apenas como ordenação numérica. A unidade da contagem não está
          confirmada e pode variar entre produtos. Mesmo com custo confirmado, esta ordenação continua sendo por
          quantidade; use a seção de valor estimado para ordenar em reais. Esta lista não compara impacto financeiro
          nem indica prioridade.
        </p>
        <ul className="alert-list">
          {a.top.map((i) => (
            <li key={i.cod} className="alert-row">
              <span className="alert-name">{i.desc}</span>
              <span className="alert-detail">Congelado {fmt(i.cong)} → contado {fmt(i.inv)}</span>
              <span className="alert-value">{fmtSigned(i.div)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel" aria-labelledby="financeiro-titulo">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Estimativa financeira</span>
            <h2 id="financeiro-titulo">Diferenças ao custo médio</h2>
          </div>
        </div>
        <p>
          O cálculo usa Qtd.Divergente × Custo Médio. Ele só é exibido depois de você confirmar que, para o arquivo
          em análise, o Custo Médio está em R$ pela mesma unidade da quantidade contada. Não usamos Emb.Compra como
          multiplicador nem presumimos a base de Custo.Rep.
        </p>
        <label className="confirm-cost">
          <input type="checkbox" checked={costConfirmed} onChange={(e) => setCostConfirmed(e.target.checked)} />
          Confirmo, para o arquivo em análise, que Custo Médio está em R$ por mesma unidade da quantidade contada.
        </label>
        <p className="panel-note">
          Ao importar outro arquivo, esta confirmação é desmarcada. Marque apenas se essa base também valer para ele.
        </p>
        {costConfirmed ? (
          <>
            <div className="finance-facts">
              <div>
                <span>Diferenças positivas</span>
                <strong>{money(valued.reduce((s, i) => s + Math.max(0, valueOf(i)), 0))}</strong>
              </div>
              <div>
                <span>Diferenças negativas (módulo)</span>
                <strong>{money(valued.reduce((s, i) => s + Math.abs(Math.min(0, valueOf(i))), 0))}</strong>
              </div>
              <div>
                <span>Produtos com custo utilizável</span>
                <strong>{valued.length} de {dataset.items.length}</strong>
              </div>
            </div>
            <div className="callout is-warning" role="note">
              <strong>Estimativa de ajuste, não prejuízo ou ganho comprovado</strong>
              <p>
                Cálculo: Qtd.Divergente × Custo Médio, arredondado por produto para centavos. Valores positivos e
                negativos ficam separados, sem compensar possíveis causas diferentes. Saldo congelado negativo também
                pode produzir estimativa positiva. Custo ausente, inválido ou negativo fica fora do cálculo.
              </p>
            </div>
            <p>
              Dez maiores valores estimados em módulo. A ordem ajuda a escolher o que conferir primeiro sob esta base
              de custo, sem provar causa ou perda.
            </p>
            <ul className="alert-list">
              {financeTop.map((i) => (
                <li key={i.cod} className="alert-row">
                  <span className="alert-name">{i.desc}</span>
                  <span className="alert-detail">
                    PLU {i.plu || "não informado"} · diferença {fmtSigned(i.div)} × custo médio {money(i.custoMedio ?? 0)}
                  </span>
                  <span className="alert-value">{valueOf(i) > 0 ? "+" : ""}{money(valueOf(i))}</span>
                </li>
              ))}
            </ul>
            {!financeTop.length && <p className="panel-note">Nenhuma diferença com custo utilizável neste arquivo.</p>}
          </>
        ) : (
          <div className="callout is-warning" role="note">
            <strong>Cálculo financeiro pausado</strong>
            <p>
              Confirme a base de Custo Médio para este arquivo antes de calcular. A análise de quantidades e os dados
              adicionais continuam disponíveis.
            </p>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="dados-titulo">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Dados adicionais</span>
            <h2 id="dados-titulo">Compra, custos e identificação</h2>
          </div>
        </div>
        <div className="callout is-warning" role="note">
          <strong>Embalagem de compra não confirma a unidade contada</strong>
          <p>
            Emb.Compra é exibida como veio no arquivo, sem multiplicar quantidades. Custo Médio e Custo.Rep também são
            valores do relatório, sem conversão. Diferença de inventário não é prejuízo comprovado.
          </p>
        </div>
        <p>
          A quantidade e a data da última compra dão contexto para conferir a nota. Não dizem quantas entradas
          ocorreram depois do inventário, nem explicam sozinhas a divergência. A data do inventário não veio neste
          arquivo.
        </p>
        {!hasExtra && <p className="panel-note">Este arquivo não trouxe os campos adicionais. A análise básica continua disponível.</p>}
        <label className="search-label">
          <span>Buscar por descrição, barras ou PLU</span>
          <input
            className="search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowAll(false);
            }}
            placeholder="Ex.: Produto Exemplo ou 0000000000011"
          />
        </label>
        <p className="panel-note">{filtered.length} de {dataset.items.length} produtos. Abra um item para consultar os campos.</p>
        {(showAll ? filtered : filtered.slice(0, 6)).map((i, index) => (
          <details className="product" key={`${i.cod}:${index}`}>
            <summary>
              <span>{i.desc}</span>
              <span className="item-div">Diferença {fmtSigned(i.div)}</span>
            </summary>
            <div className="product-data">
              <dl>
                <div><dt>Código de barras</dt><dd>{i.cod}</dd></div>
                <div><dt>Código PLU</dt><dd>{i.plu || "Não informado"}</dd></div>
                <div><dt>Embalagem de compra</dt><dd>{i.emb || "Não informada"}</dd></div>
                <div><dt>Congelado / contado</dt><dd>{fmt(i.cong)} / {fmt(i.inv)}</dd></div>
                <div><dt>Estoque atual</dt><dd>{fmt(i.atual)}</dd></div>
                <div><dt>Última compra (data)</dt><dd>{i.ultimaData || "Não informada"}</dd></div>
                <div><dt>Qtd. última compra</dt><dd>{i.ultimaQtd == null ? "Não informada" : fmt(i.ultimaQtd)}</dd></div>
                <div><dt>Custo.Rep (relatório)</dt><dd>{i.custoRep == null ? "Não informado" : i.custoRep.toFixed(2).replace(".", ",")}</dd></div>
                <div><dt>Custo Médio (relatório)</dt><dd>{i.custoMedio == null ? "Não informado" : i.custoMedio.toFixed(2).replace(".", ",")}</dd></div>
              </dl>
              <p className="panel-note">
                Quantidade de compra, embalagem e custos sem conversão de unidade. Não usar estes valores como perdas
                ou ganhos comprovados.
              </p>
            </div>
          </details>
        ))}
        {filtered.length > 6 && (
          <button type="button" className="secondary-action" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Mostrar menos produtos" : `Ver todos os ${filtered.length} produtos`}
          </button>
        )}
        {!filtered.length && <p className="panel-note">Nenhum produto encontrado. Apague a busca para ver todos.</p>}
      </section>

      <section className="panel" aria-labelledby="importante-titulo">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">Importante</span>
            <h2 id="importante-titulo">Alertas são hipóteses, não conclusões</h2>
          </div>
        </div>
        <p>
          Divergência negativa não prova perda e contagem zero não prova esquecimento. Para detectar recorrência,
          compare inventários de datas diferentes; para estimar valores em reais, confirme a moeda e a base do custo
          de cada produto primeiro. Este sistema lê um inventário por vez.
        </p>
      </section>
    </>
  );
}
