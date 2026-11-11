import Papa from "papaparse";

export type Item = {
  cod: string;
  desc: string;
  atual: number;
  cong: number;
  inv: number;
  div: number;
  plu?: string;
  emb?: string;
  ultimaQtd?: number | null;
  ultimaData?: string;
  custoRep?: number | null;
  custoMedio?: number | null;
};

export type Pair = { a: Item; b: Item; familia: string };

export type Dataset = { name: string; items: Item[]; warnings: string[] };

export type Analysis = {
  negCong: Item[];
  zeroCount: Item[];
  negAtual: Item[];
  top: Item[];
  ok: number;
  pairs: Pair[];
};

export function fmt(n: number): string {
  const neg = n < 0;
  const s = Math.abs(n).toFixed(3).replace(/\.?0+$/, "");
  const [int, dec] = s.split(".");
  const mil = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (neg ? "-" : "") + mil + (dec ? "," + dec : "");
}

export function money(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtSigned(n: number): string {
  return (n > 0 ? "+" : "") + fmt(n);
}

export function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const CATEGORY = new Set(["FRUTA", "VERDURA", "LEGUME", "LEGUMES", "OVOS", "OVO", "MERCEARIA", "FLV", "HORTIFRUTI"]);
const UNIT = new Set(["KG", "UN", "BDJ", "DZ", "PCT", "BANDEJA", "SACOLINHA", "L", "CX", "FD"]);

function familia(desc: string): string {
  const tokens = desc.toUpperCase().split(/[^A-Z0-9À-Ý]+/).filter((t) => t && !/^\d+$/.test(t));
  for (const t of tokens) {
    if (!CATEGORY.has(t) && !UNIT.has(t) && t.length > 1) {
      return tokens[0] === "CREME"
        ? tokens.filter((x) => !CATEGORY.has(x) && !UNIT.has(x) && x.length > 1).slice(0, 3).join(" ")
        : t;
    }
  }
  return tokens[0] ?? "";
}

export function analyze(items: Item[]): Analysis {
  const negCong = items.filter((i) => i.cong < 0).sort((x, y) => y.div - x.div);
  const zeroCount = items.filter((i) => i.inv === 0 && i.cong > 0).sort((x, y) => y.cong - x.cong);
  const negAtual = items.filter((i) => i.atual < 0).sort((x, y) => x.atual - y.atual);
  const top = [...items].sort((x, y) => Math.abs(y.div) - Math.abs(x.div)).slice(0, 10);
  const ok = items.filter((i) => i.div === 0).length;

  const grupos = new Map<string, Item[]>();
  for (const i of items) {
    const f = familia(i.desc);
    if (!f) continue;
    const arr = grupos.get(f) ?? [];
    arr.push(i);
    grupos.set(f, arr);
  }
  const pairs: Pair[] = [];
  for (const [f, arr] of grupos) {
    if (arr.length < 2) continue;
    for (let x = 0; x < arr.length; x++) {
      for (let y = x + 1; y < arr.length; y++) {
        const a = arr[x];
        const b = arr[y];
        if (a.div * b.div >= 0) continue;
        const mn = Math.min(Math.abs(a.div), Math.abs(b.div));
        const mx = Math.max(Math.abs(a.div), Math.abs(b.div));
        if (mn >= 2 && mn / mx >= 0.5) pairs.push({ a, b, familia: f });
      }
    }
  }
  return { negCong, zeroCount, negAtual, top, ok, pairs };
}

function parseNum(s: string): number | null {
  const t = s.trim();
  if (!/^[+-]?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?$/.test(t) && !/^[+-]?\d+(?:\.\d+)?$/.test(t)) return null;
  if (!t) return null;
  const v = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Lê o CSV de divergências exportado do ERP (Intersolid), separado por ponto e vírgula.
 * O relatório pode ter linhas de preamble antes do cabeçalho; procuramos a linha com
 * Cód.Barra + Descrição. Códigos de barras e PLU são tratados como texto para
 * preservar zeros à esquerda.
 */
export function parseCsv(text: string): { items: Item[]; warnings: string[] } | { error: string } {
  const parsed = Papa.parse<string[]>(text, {
    delimiter: ";",
    skipEmptyLines: false,
  });
  const lines = parsed.data.filter((row) => Array.isArray(row));

  const headerIdx = lines.findIndex((row) => {
    const n = norm(row.join(";"));
    return n.includes("barra") && n.includes("descr");
  });
  if (headerIdx < 0) {
    return {
      error:
        "Não encontrei o cabeçalho do relatório (a linha com Cód.Barra, Descrição, quantidades). Este sistema espera o CSV de divergências do ERP, separado por ponto e vírgula.",
    };
  }

  const cols = lines[headerIdx].map(norm);
  const col = (key: string) => cols.findIndex((c) => c.includes(key));
  const cCod = col("barra");
  const cDesc = col("descr");
  const cAtual = col("atual");
  const cCong = col("cong");
  const cInv = col("invent");
  const cDiv = col("diverg");
  const cPlu = col("plu");
  const cEmb = col("emb.compra");
  const cUltQtd = cols.findIndex((c) => c.includes("qtd") && c.includes("compra"));
  const cUltData = cols.findIndex((c) => c.includes("data") && c.includes("compra"));
  const cRep = col("custo.rep");
  const cMed = col("custo medio");

  if (cCod < 0 || cDesc < 0 || cCong < 0 || cInv < 0 || cDiv < 0) {
    return { error: "O cabeçalho existe, mas faltam colunas esperadas (congelado, inventário ou divergente)." };
  }

  const items: Item[] = [];
  const warnings: string[] = [];
  let skipped = 0;
  let mismatches = 0;
  let dupes = 0;
  const seen = new Set<string>();

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = lines[i];
    const cod = (cells[cCod] ?? "").trim();
    const desc = (cells[cDesc] ?? "").trim();
    if (!cod && !desc) continue;
    const cong = parseNum(cells[cCong] ?? "");
    const inv = parseNum(cells[cInv] ?? "");
    const div = parseNum(cells[cDiv] ?? "");
    const atual = cAtual >= 0 ? parseNum(cells[cAtual] ?? "") : null;
    if (!cod || cong === null || inv === null || div === null) {
      skipped++;
      continue;
    }
    if (seen.has(cod)) dupes++;
    seen.add(cod);
    if (Math.abs(inv - cong - div) > 0.011) mismatches++;
    items.push({
      cod,
      desc: desc || cod,
      atual: atual ?? 0,
      cong,
      inv,
      div,
      plu: cells[cPlu]?.trim(),
      emb: cells[cEmb]?.trim(),
      ultimaQtd: parseNum(cells[cUltQtd] ?? ""),
      ultimaData: cells[cUltData]?.trim(),
      custoRep: parseNum(cells[cRep] ?? ""),
      custoMedio: parseNum(cells[cMed] ?? ""),
    });
  }

  if (!items.length) {
    return { error: "O arquivo não tem nenhuma linha de produto legível depois do cabeçalho." };
  }
  if (skipped) warnings.push(`${skipped} linha(s) ignoradas por não terem os números esperados.`);
  if (mismatches) {
    warnings.push(`${mismatches} produto(s) com a conta divergente = contado - congelado não batendo. Vale conferir a exportação.`);
  }
  if (dupes) warnings.push(`${dupes} código(s) de barras repetidos no arquivo.`);
  return { items, warnings };
}

export function valueOf(i: Item): number {
  return Math.round(i.div * (i.custoMedio ?? 0) * 100) / 100;
}
