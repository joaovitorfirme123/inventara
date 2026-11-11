import type { Dataset } from "@/lib/divergencias";
import type { SavedAnalysis } from "@/lib/divergencias-storage";

/** Chamadas do navegador para as rotas de API do histórico de divergências (login da organização obrigatório). */

async function parse(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function listAnalyses(full = false): Promise<SavedAnalysis[] | { error: string }> {
  try {
    const res = await fetch(`/api/divergencias/analises${full ? "?full=1" : ""}`, { cache: "no-store" });
    const data = await parse(res);
    if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Não consegui ler o histórico agora." };
    return (data.records ?? []) as SavedAnalysis[];
  } catch {
    return { error: "Não consegui ler o histórico agora." };
  }
}

export async function saveAnalysisOnline(dataset: Dataset, inventoryDate: string): Promise<{ record: SavedAnalysis } | { error: string }> {
  try {
    const res = await fetch("/api/divergencias/analises", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inventoryDate, name: dataset.name, dataset }),
    });
    const data = await parse(res);
    if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Não consegui salvar agora." };
    return { record: data.record as SavedAnalysis };
  } catch {
    return { error: "Não consegui salvar agora." };
  }
}

export async function removeAnalysisOnline(id: string): Promise<{ ok: true } | { error: string }> {
  try {
    const res = await fetch(`/api/divergencias/analises/${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await parse(res);
    if (!res.ok) return { error: typeof data.error === "string" ? data.error : "Não consegui remover agora." };
    return { ok: true };
  } catch {
    return { error: "Não consegui remover agora." };
  }
}
