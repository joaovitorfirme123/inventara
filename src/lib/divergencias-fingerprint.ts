import { createHash } from "node:crypto";
import type { Dataset } from "./divergencias";
import { normalizeInventoryDate } from "./inventory-date";

/**
 * Impressão digital do conteúdo de uma análise, para detectar o mesmo CSV
 * salvo duas vezes. Usa os campos validados de cada item (código de barras e
 * os quatro números do relatório), na ordem do arquivo. Campos extras (PLU,
 * custos etc.) não entram: o que define a duplicata é a contagem em si.
 * Retorna null quando a estrutura não é a esperada; nesse caso a verificação
 * de duplicata é simplesmente pulada, sem bloquear a gravação.
 */
export function datasetFingerprint(dataset: Dataset | unknown): string | null {
  try {
    const items = (dataset as Dataset)?.items;
    if (!Array.isArray(items)) return null;
    const h = createHash("sha256");
    for (const i of items) {
      if (!i || typeof i.cod !== "string") return null;
      h.update(i.cod);
      h.update(" ");
      h.update(String(i.cong));
      h.update(" ");
      h.update(String(i.inv));
      h.update(" ");
      h.update(String(i.div));
      h.update(" ");
      h.update(String(i.atual));
      h.update("");
    }
    return h.digest("hex");
  } catch {
    return null;
  }
}

/**
 * Chave de data para a verificação de duplicata: datas válidas comparam na
 * forma normalizada (09/11/2026 = 9/11/2026); textos antigos fora do formato
 * comparam como vieram; ausência de data só é igual a ausência de data.
 * Assim, o mesmo CSV salvo para OUTRA data de inventário não é duplicata:
 * inventários de datas diferentes podem ter valores iguais e são legítimos.
 */
export function inventoryDateKey(text: string | null | undefined): string {
  return normalizeInventoryDate(text) ?? (text?.trim() ?? "");
}
