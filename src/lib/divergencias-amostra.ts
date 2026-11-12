import type { Dataset, Item } from "./divergencias";
import amostra from "@/data/amostra-divergencias.json";

/**
 * Amostra 100% sintética, só para demonstrar a interface.
 * Nenhum dado real de loja entra neste arquivo.
 */
export const SAMPLE_ITEMS: Item[] = amostra.items as Item[];

export const SAMPLE_NAME: string = amostra.name;

/**
 * Confere se um dataset é exatamente a amostra de demonstração: mesmo número
 * de itens e, item a item, mesmo código, descrição e números do relatório.
 * Comparar o conteúdo completo (e não só alguns códigos) evita recusar um CSV
 * real por coincidência de código de barras.
 */
export function isSampleDataset(dataset: Dataset | unknown): boolean {
  const items = (dataset as Dataset)?.items;
  if (!Array.isArray(items) || items.length !== SAMPLE_ITEMS.length) return false;
  return items.every((it, idx) => {
    const s = SAMPLE_ITEMS[idx];
    return (
      !!it &&
      it.cod === s.cod &&
      it.desc === s.desc &&
      it.cong === s.cong &&
      it.inv === s.inv &&
      it.div === s.div &&
      it.atual === s.atual
    );
  });
}
