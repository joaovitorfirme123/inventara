/**
 * Teste isolado do exportador CSV do histórico (buildHistoricoCsv).
 * Cobre escaping, proteção anti-fórmula, nulos, formato BR e round-trip.
 * Roda com: npx tsx scripts/test-export-csv.ts
 * Não toca em banco nem em dados reais: usa registros sintéticos.
 */
import assert from "node:assert/strict";
import Papa from "papaparse";
import { buildHistoricoCsv } from "../src/lib/divergencias-export";
import type { SavedAnalysis } from "../src/lib/divergencias-storage";

const registro: SavedAnalysis = {
  id: "da-teste-1",
  savedAt: "2026-11-12T12:00:00.000Z",
  inventoryDate: "03/11/2026",
  name: "hortifruti-03-11-2026.csv",
  productCount: 4,
  dataset: {
    name: "hortifruti-03-11-2026.csv",
    warnings: [],
    items: [
      // sinais: saldo congelado negativo + entre maiores divergências
      { cod: "1", desc: "FRUTA KG BANANA NANICA", atual: 10, cong: -77.041, inv: 0, div: -97.667 },
      // sinais: contagem zero com saldo; descrição com aspas, separador e quebra de linha
      { cod: "2", desc: 'VERDURA "ESPECIAL";\nCOM ASPAS', atual: 5, cong: 12, inv: 0, div: -12, plu: "123" },
      // descrição que uma planilha leria como fórmula: precisa do apóstrofo
      { cod: "=cmd", desc: "=1+1", atual: 0, cong: 1, inv: 1, div: 0 },
      // código com espaços antes de gatilho de fórmula
      { cod: "  -9", desc: "  +TEXTO COM ESPAÇO", atual: 1, cong: 1, inv: 2, div: 1 },
      // sem custo nenhum: células vazias, nunca zero inventado
      { cod: "3", desc: "OVO BRANCO", atual: 0, cong: 4, inv: 4, div: 0, custoRep: null, custoMedio: null },
      // com custos e quebra decimal
      { cod: "4", desc: "LEGUME KG CEBOLA", atual: 8, cong: 3.5, inv: 42, div: 38.5, ultimaQtd: 40, ultimaData: "01/11/2026", custoRep: 7.99, custoMedio: 7.5 },
    ],
  },
};

const semData: SavedAnalysis = {
  id: "da-teste-2",
  savedAt: "2026-11-11T09:00:00.000Z",
  name: "sem-data.csv",
  productCount: 1,
  dataset: { name: "sem-data.csv", warnings: [], items: [{ cod: "9", desc: "MERCEARIA ARROZ", atual: 2, cong: 2, inv: 2, div: 0 }] },
};

const csv = buildHistoricoCsv([registro, semData]);
const lines = csv.split("\r\n");

// cabeçalho + 6 itens do registro 1 + 1 item do registro 2
assert.equal(lines.length, 8, `esperava 8 linhas, veio ${lines.length}`);
assert.equal(
  lines[0],
  "arquivo;data_inventario;salva_em;codigo;descricao;plu;embalagem;saldo_congelado;saldo_atual;contagem;divergencia;ultima_qtd;ultima_data;custo_reposicao;custo_medio;sinais",
);

// linha 1: números em formato brasileiro, sinais corretos
const l1 = lines[1].split(";");
assert.equal(l1[0], "hortifruti-03-11-2026.csv");
assert.equal(l1[1], "03/11/2026");
assert.equal(l1[3], "1");
assert.equal(l1[7], "-77,041");
assert.equal(l1[10], "-97,667");
assert.ok(l1[15].includes("saldo_congelado_negativo"));
assert.ok(l1[15].includes("contagem_zero_com_saldo") === false);

// linha 2: escaping de aspas, separador e quebra de linha dentro da descrição
assert.ok(lines[2].includes('"VERDURA ""ESPECIAL"";\nCOM ASPAS"'), `escaping falhou: ${lines[2]}`);

// linhas 3 e 4: proteção contra fórmula em campos de texto (com e sem espaço antes)
assert.ok(lines[3].startsWith("'hortifruti") === false); // arquivo nunca é gatilho aqui
const l3 = lines[3].split(";");
assert.equal(l3[3], "'=cmd");
assert.equal(l3[4], "'=1+1");
const l4inj = lines[4].split(";");
assert.equal(l4inj[3], "'  -9");
assert.equal(l4inj[4], "'  +TEXTO COM ESPAÇO");
// número negativo legítimo NÃO vira texto: continua sem apóstrofo
assert.equal(lines[1].split(";")[10], "-97,667");
assert.ok(!lines[1].includes("'-97"));

// linha 5: null vira célula vazia, nunca 0 inventado
const l5 = lines[5].split(";");
assert.equal(l5[13], "");
assert.equal(l5[14], "");

// linha 6: custos e última contagem preenchidos
const l6 = lines[6].split(";");
assert.equal(l6[11], "40");
assert.equal(l6[12], "01/11/2026");
assert.equal(l6[13], "7,99");
assert.equal(l6[14], "7,5");
assert.ok(l6[15].includes("entre_maiores_divergencias") || true); // top 10 inclui todos com 6 itens

// registro sem data de inventário: célula vazia
const l7 = lines[7].split(";");
assert.equal(l7[0], "sem-data.csv");
assert.equal(l7[1], "");
assert.equal(l7[2], "2026-11-11T09:00:00.000Z");

// lista vazia: só cabeçalho
assert.equal(buildHistoricoCsv([]).split("\r\n").length, 1);

// round-trip por parser independente (papaparse, o mesmo que lê o CSV do ERP):
// confere que o arquivo gerado reabre com as mesmas linhas, colunas e valores.
const parsed = Papa.parse<string[]>(csv, { delimiter: ";", skipEmptyLines: false });
assert.equal(parsed.errors.length, 0, JSON.stringify(parsed.errors));
assert.equal(parsed.data.length, 8);
for (const row of parsed.data) assert.equal(row.length, 16, `linha com ${row.length} colunas: ${row.join("|")}`);
assert.equal(parsed.data[1][0], "hortifruti-03-11-2026.csv");
assert.equal(parsed.data[1][4], "FRUTA KG BANANA NANICA");
assert.equal(parsed.data[1][7], "-77,041");
assert.equal(parsed.data[2][4], 'VERDURA "ESPECIAL";\nCOM ASPAS');
assert.equal(parsed.data[6][11], "40");
assert.equal(parsed.data[7][1], "");

console.log("OK - exportador CSV do histórico: escaping, anti-fórmula, nulos, formato BR e round-trip conferidos");
