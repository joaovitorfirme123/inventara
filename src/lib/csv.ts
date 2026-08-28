import Papa from "papaparse";

export type CsvProduct = {
  plu: string;
  barcode: string | null;
  description: string;
  section: string | null;
  group: string | null;
  subgroup: string | null;
  lastInventory: string | null;
  currentStock: string;
};

export type CsvRowError = {
  row: number;
  message: string;
};

export type CsvParseResult = {
  delimiter: string;
  encoding: "UTF-8" | "Windows-1252";
  totalRows: number;
  rows: CsvProduct[];
  errors: CsvRowError[];
  fatalErrors: string[];
};

const headerAliases = {
  plu: ["codigo plu", "plu"],
  barcode: ["codigo de barras", "codigo barras", "barcode"],
  description: ["descricao", "description"],
  section: ["secao", "descricao secao", "section"],
  group: ["grupo", "descricao grupo", "group"],
  subgroup: ["subgrupo", "descricao subgrupo", "subgroup"],
  lastInventory: [
    "ultimo inventario",
    "data ultimo inventario",
    "data ult inventario",
    "last inventory",
  ],
  currentStock: ["estoque atual", "current stock"],
} satisfies Record<keyof CsvProduct, string[]>;

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

function parseDate(value: string) {
  if (!value) {
    return null;
  }

  const brDate = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
  const isoDate = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  const parts = brDate
    ? [Number(brDate[3]), Number(brDate[2]), Number(brDate[1])]
    : isoDate
      ? [Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3])]
      : null;

  if (!parts) {
    throw new Error("Data de último inventário inválida.");
  }

  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Data de último inventário inválida.");
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseStock(value: string) {
  if (!value) {
    return "0";
  }

  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    throw new Error("Estoque atual inválido.");
  }

  return normalized;
}

export function parseCsvBuffer(buffer: ArrayBuffer): CsvParseResult {
  const { text, encoding } = decodeCsv(buffer);
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const headerLineIndex = lines.findIndex((line) => {
    const fields = line.split(/[;,\t]/).map(normalizeHeader);

    return Object.values(headerAliases).every((aliases) =>
      aliases.some((alias) => fields.includes(alias)),
    );
  });
  const csvText = lines.slice(Math.max(headerLineIndex, 0)).join("\n");
  const lineOffset = Math.max(headerLineIndex, 0);
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    delimiter: "",
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  const fields = parsed.meta.fields ?? [];
  const normalizedFields = new Map(
    fields.map((field) => [normalizeHeader(field), field]),
  );
  const columns = Object.fromEntries(
    Object.entries(headerAliases).map(([key, aliases]) => [
      key,
      aliases.map((alias) => normalizedFields.get(alias)).find(Boolean),
    ]),
  ) as Record<keyof CsvProduct, string | undefined>;
  const missingHeaders = Object.entries(columns)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingHeaders.length > 0) {
    return {
      delimiter: parsed.meta.delimiter,
      encoding,
      totalRows: parsed.data.length,
      rows: [],
      errors: [],
      fatalErrors: [
        `Cabeçalhos obrigatórios ausentes: ${missingHeaders.join(", ")}.`,
      ],
    };
  }

  const parserErrors = new Map<number, string[]>();
  for (const error of parsed.errors) {
    const row = (error.row ?? 0) + lineOffset + 2;
    parserErrors.set(row, [...(parserErrors.get(row) ?? []), error.message]);
  }

  const rows: CsvProduct[] = [];
  const errors: CsvRowError[] = [];
  const seenPlus = new Set<string>();

  parsed.data.forEach((data, index) => {
    const rowNumber = index + lineOffset + 2;
    const rowParserErrors = parserErrors.get(rowNumber);

    if (rowParserErrors) {
      errors.push({ row: rowNumber, message: rowParserErrors.join(" ") });
      return;
    }

    const getValue = (column: keyof CsvProduct) =>
      data[columns[column] as string]?.trim() ?? "";
    const plu = getValue("plu");
    const description = getValue("description");

    if (!plu) {
      errors.push({ row: rowNumber, message: "Código PLU é obrigatório." });
      return;
    }

    if (seenPlus.has(plu)) {
      errors.push({ row: rowNumber, message: `PLU ${plu} duplicado no arquivo.` });
      return;
    }

    if (!description) {
      errors.push({ row: rowNumber, message: "Descrição é obrigatória." });
      return;
    }

    try {
      rows.push({
        plu,
        barcode: getValue("barcode") || null,
        description,
        section: getValue("section") || null,
        group: getValue("group") || null,
        subgroup: getValue("subgroup") || null,
        lastInventory: parseDate(getValue("lastInventory")),
        currentStock: parseStock(getValue("currentStock")),
      });
      seenPlus.add(plu);
    } catch (error: unknown) {
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : "Linha inválida.",
      });
    }
  });

  return {
    delimiter: parsed.meta.delimiter,
    encoding,
    totalRows: parsed.data.length,
    rows,
    errors,
    fatalErrors: [],
  };
}
