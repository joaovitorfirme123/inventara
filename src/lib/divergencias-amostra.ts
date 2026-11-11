import type { Item } from "./divergencias";
import amostra from "@/data/amostra-divergencias.json";

/**
 * Amostra 100% sintética, só para demonstrar a interface.
 * Nenhum dado real de loja entra neste arquivo.
 */
export const SAMPLE_ITEMS: Item[] = amostra.items as Item[];

export const SAMPLE_NAME: string = amostra.name;
