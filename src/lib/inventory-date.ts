/**
 * Data do inventário em texto brasileiro (DD/MM/AAAA).
 * Compartilhada entre navegador e servidor: a validação e a data assumida são
 * as mesmas nos dois lados. Análises antigas podem ter datas em texto livre ou
 * nenhuma data; isso continua válido na leitura. A validação vale só para
 * análises novas.
 */

/** Interpreta DD/MM/AAAA (aceita 9/11/2026) como data real de calendário. Null quando inválida. */
export function parseInventoryDate(text: string | null | undefined): Date | null {
  if (!text) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (year < 2000 || year > 2100) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d;
}

/** Normaliza para DD/MM/AAAA com zeros à esquerda; null quando o texto não é uma data válida. */
export function normalizeInventoryDate(text: string | null | undefined): string | null {
  const d = parseInventoryDate(text);
  if (!d) return null;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/**
 * Erro de validação para salvar, ou null quando a data pode ser salva.
 * Texto vazio é válido (a data continua opcional e assume o dia atual ao
 * salvar). O único requisito é ser uma data real de calendário no formato
 * DD/MM/AAAA.
 */
export function inventoryDateError(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  if (!parseInventoryDate(t)) {
    return `A data do inventário "${t}" não é uma data real no formato DD/MM/AAAA (ex.: 09/11/2026). Corrija ou deixe em branco.`;
  }
  return null;
}

/**
 * Data de "hoje" em DD/MM/AAAA no horário de Brasília (America/Sao_Paulo).
 * É a data assumida quando a análise é salva sem data informada.
 */
export function todayInventoryDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")}`;
}

/**
 * Data gravada ao salvar: a data informada, normalizada, ou o dia atual no
 * horário de Brasília quando o campo fica em branco. Undefined só quando o
 * texto não é uma data real (caso que a validação recusa antes de salvar).
 * Navegador e servidor usam esta mesma função para concordar na data assumida.
 */
export function inventoryDateForSave(text: string | null | undefined, now: Date = new Date()): string | undefined {
  const t = text?.trim() ?? "";
  if (!t) return todayInventoryDate(now);
  return normalizeInventoryDate(t) ?? undefined;
}
