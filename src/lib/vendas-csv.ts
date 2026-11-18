import "server-only";

import { createHash } from "node:crypto";
import Papa from "papaparse";

export type VendaCsvRow = {
  row: number;
  plu: string;
  description: string | null;
  soldAt: string;
  store: string | null;
  couponNumber: string | null;
  pdv: string | null;
  unitPrice: string;
  quantity: string;
  totalValue: string;
  rowHash: string;
};

export type VendaCsvError = {
  row: number;
  plu: string | null;
  description: string | null;
  field: string;
  message: string;
};

export type VendaCsvParseResult = {
  encoding: "UTF-8" | "Windows-1252";
  totalRows: number;
  rows: VendaCsvRow[];
  errors: VendaCsvError[];
  fatalErrors: string[];
};

type VendaField =
  | "plu"
  | "soldAt"
  | "description"
  | "store"
  | "couponNumber"
  | "pdv"
  | "unitPrice"
  | "quantity"
  | "totalValue";

const columnAliases: Record<VendaField, string[]> = {
  plu: ["codigo plu", "plu"],
  soldAt: ["data venda", "data da venda", "data"],
  description: ["descricao", "descricao produto", "produto"],
  store: ["loja"],
  couponNumber: ["numero do cupom", "numero cupom", "cupom", "n cupom"],
  pdv: ["pdv", "caixa"],
  unitPrice: ["preco venda", "preco unitario", "preco"],
  quantity: ["quantidade total", "quantidade", "qtd"],
  totalValue: ["valor total", "total"],
};

const requiredFields: VendaField[] = ["plu", "soldAt", "quantity", "totalValue"];

const fieldLabels: Record<VendaField, string> = {
  plu: "Código PLU",
  soldAt: "Data Venda",
  description: "Descrição",
  store: "Loja",
  couponNumber: "Número do Cupom",
  pdv: "PDV",
  unitPrice: "Preço Venda",
  quantity: "Quantidade Total",
  totalValue: "Valor Total",
};

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function decodeCsv(buffer: ArrayBuffer) {
  try {
    return {
      text: new TextDecoder("utf-8", { fatal: true }).decode(buffer),
      encoding: "UTF-8" as const,
    };
  } catch {
    return {
      text: new TextDecoder("windows-1252").decode(buffer),
      encoding: "Windows-1252" as const,
    };
  }
}

function parseSaleDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const brDate = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(trimmed);
  const isoDate = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  const parts = brDate
    ? [Number(brDate[3]), Number(brDate[2]), Number(brDate[1])]
    : isoDate
      ? [Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3])]
      : null;

  if (!parts) return null;

  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDecimal(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) return null;

  return normalized;
}

function clean(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed || null;
}

function buildRowHash(fields: Array<string | null>): string {
  return createHash("sha256").update(fields.map((field) => field ?? "").join("|")).digest("hex");
}

export function parseSalesCsvBuffer(buffer: ArrayBuffer): VendaCsvParseResult {
  const { text, encoding } = decodeCsv(buffer);
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);

  const headerIndex = lines.findIndex((line) => {
    const normalized = normalizeHeader(line);
    return normalized.includes("codigo plu") && normalized.includes("data venda");
  });

  if (headerIndex === -1) {
    return {
      encoding,
      totalRows: 0,
      rows: [],
      errors: [],
      fatalErrors: [
        'Não encontrei o cabeçalho do relatório de vendas ("Código PLU" e "Data Venda"). Este arquivo parece ser de outro relatório; o cadastro de produtos continua sendo importado na aba Importações.',
      ],
    };
  }

  const csvText = lines.slice(headerIndex).join("\n");
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    delimiter: "",
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => normalizeHeader(header),
  });

  const headers = parsed.meta.fields ?? [];
  const columnMap = new Map<VendaField, string>();

  for (const [field, aliases] of Object.entries(columnAliases) as Array<[VendaField, string[]]>) {
    const match = headers.find((header) => aliases.includes(header));
    if (match) columnMap.set(field, match);
  }

  const missing = requiredFields.filter((field) => !columnMap.has(field));
  if (missing.length > 0) {
    return {
      encoding,
      totalRows: 0,
      rows: [],
      errors: [],
      fatalErrors: [
        `Cabeçalho de vendas incompleto. Colunas obrigatórias não encontradas: ${missing
          .map((field) => fieldLabels[field])
          .join(", ")}.`,
      ],
    };
  }

  const rows: VendaCsvRow[] = [];
  const errors: VendaCsvError[] = [];

  parsed.data.forEach((record, index) => {
    const rowNumber = headerIndex + index + 2;
    const read = (field: VendaField) => {
      const column = columnMap.get(field);
      return column ? (record[column] ?? "") : "";
    };

    const plu = clean(read("plu"));
    const description = clean(read("description"));
    const soldAt = parseSaleDate(read("soldAt"));
    const quantity = parseDecimal(read("quantity"));
    const totalValue = parseDecimal(read("totalValue"));
    const unitPrice = parseDecimal(read("unitPrice")) ?? "0";

    if (!plu) {
      errors.push({ row: rowNumber, plu: null, description, field: fieldLabels.plu, message: "Linha sem código PLU." });
      return;
    }

    if (!soldAt) {
      errors.push({ row: rowNumber, plu, description, field: fieldLabels.soldAt, message: "Data de venda inválida." });
      return;
    }

    if (quantity === null) {
      errors.push({ row: rowNumber, plu, description, field: fieldLabels.quantity, message: "Quantidade inválida." });
      return;
    }

    if (totalValue === null) {
      errors.push({ row: rowNumber, plu, description, field: fieldLabels.totalValue, message: "Valor total inválido." });
      return;
    }

    const store = clean(read("store"));
    const couponNumber = clean(read("couponNumber"));
    const pdv = clean(read("pdv"));

    rows.push({
      row: rowNumber,
      plu,
      description,
      soldAt,
      store,
      couponNumber,
      pdv,
      unitPrice,
      quantity,
      totalValue,
      rowHash: buildRowHash([plu, soldAt, store, couponNumber, pdv, unitPrice, quantity, totalValue]),
    });
  });

  return {
    encoding,
    totalRows: parsed.data.length,
    rows,
    errors,
    fatalErrors: [],
  };
}
