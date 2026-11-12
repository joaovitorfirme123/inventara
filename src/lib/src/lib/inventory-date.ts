/**
 * Data do inventário em texto brasileiro (DD/MM/AAAA).
 * Compartilhada entre navegador e servidor: a validação é a mesma nos dois lados.
 * Análises antigas podem ter datas em texto livre ou nenhuma data; isso continua
 * válido na leitura. A validação vale só para análises novas.
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
 * Texto vazio é válido (a data continua opcional). O único requisito é ser
 * uma data real de calendário no formato DD/MM/AAAA.
 */
export function inventoryDateError(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  if (!parseInventoryDate(t)) {
    return `A data do inventário "${t}" não é uma data real no formato DD/MM/AAAA (ex.: 09/11/2026). Corrija ou deixe em branco.`;
  }
  return null;
}
