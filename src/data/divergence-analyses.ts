import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { Dataset } from "@/lib/divergencias";
import {
  isValidAnalysis,
  MAX_ANALISES,
  type SavedAnalysis,
} from "@/lib/divergencias-storage";
import { inventoryDateError, normalizeInventoryDate } from "@/lib/inventory-date";
import { isSampleDataset } from "@/lib/divergencias-amostra";
import { datasetFingerprint, inventoryDateKey } from "@/lib/divergencias-fingerprint";

export const MAX_DATASET_ITEMS = 20000;
export const MAX_BODY_CHARS = 8_000_000;
export const LIMIT_MESSAGE = `O limite de ${MAX_ANALISES} análises salvas foi atingido. Remova análises antigas no Histórico antes de salvar outra. Nada foi apagado.`;

type AnalysisRow = {
  id: string;
  organizationId: string;
  name: string;
  inventoryDate: string | null;
  productCount: number;
  savedAt: Date;
  dataset?: unknown;
};

function toRecord(r: AnalysisRow, full: boolean): SavedAnalysis | Omit<SavedAnalysis, "dataset"> {
  const base = {
    id: r.id,
    savedAt: r.savedAt.toISOString(),
    inventoryDate: r.inventoryDate ?? undefined,
    name: r.name,
    productCount: r.productCount,
  };
  return full ? { ...base, dataset: r.dataset as Dataset } : base;
}

export async function listDivergenceAnalyses(organizationId: string) {
  const rows = await prisma.divergenceAnalysis.findMany({
    where: { organizationId },
    orderBy: { savedAt: "desc" },
    select: { id: true, organizationId: true, name: true, inventoryDate: true, productCount: true, savedAt: true },
  });
  return rows.map((r) => toRecord(r, false));
}

export async function listDivergenceAnalysesFull(organizationId: string): Promise<SavedAnalysis[]> {
  const rows = await prisma.divergenceAnalysis.findMany({
    where: { organizationId },
    orderBy: { savedAt: "desc" },
  });
  return rows.map((r) => toRecord(r, true) as SavedAnalysis);
}

/** Valida e monta o registro a salvar, reusando a validação compartilhada com o navegador. */
export function buildDivergenceRecord(input: unknown): { name: string; inventoryDate?: string; productCount: number; dataset: Dataset } | { error: string } {
  const body = input as { inventoryDate?: unknown; name?: unknown; dataset?: unknown } | null;
  if (!body || typeof body !== "object") return { error: "Pedido inválido." };
  const dataset = body.dataset as Dataset | undefined;
  if (!dataset || typeof dataset !== "object" || !Array.isArray(dataset.items)) {
    return { error: "A análise enviada não tem a estrutura esperada." };
  }
  if (dataset.items.length > MAX_DATASET_ITEMS) {
    return { error: `A análise tem produtos demais para salvar (limite de ${MAX_DATASET_ITEMS} por análise).` };
  }
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 200) : String(dataset.name ?? "").slice(0, 200);
  if (isSampleDataset(dataset)) {
    return { error: "A amostra de demonstração é só para explorar a tela. Importe um CSV do ERP antes de salvar no histórico." };
  }
  const rawDate = typeof body.inventoryDate === "string" ? body.inventoryDate : "";
  const dateProblem = inventoryDateError(rawDate);
  if (dateProblem) return { error: dateProblem };
  const inventoryDate = normalizeInventoryDate(rawDate) ?? undefined;
  const candidate: SavedAnalysis = {
    id: "srv-check",
    savedAt: new Date().toISOString(),
    inventoryDate,
    name: name || "Análise",
    productCount: dataset.items.length,
    dataset: { ...dataset, name: name || dataset.name, warnings: Array.isArray(dataset.warnings) ? dataset.warnings : [] },
  };
  if (!isValidAnalysis(candidate)) {
    return { error: "A análise enviada tem campos ou números inválidos. Nada foi salvo." };
  }
  return { name: candidate.name, inventoryDate, productCount: candidate.productCount, dataset: candidate.dataset };
}

/**
 * Salva uma análise na organização, com limite atômico por organização:
 * a reserva de vaga é um único INSERT ... ON CONFLICT com trava de linha,
 * então duas gravações simultâneas não passam do limite.
 */
export async function createDivergenceAnalysis(
  organizationId: string,
  record: { name: string; inventoryDate?: string; productCount: number; dataset: Dataset },
): Promise<SavedAnalysis | "LIMIT_REACHED" | { duplicate: { id: string; name: string; inventoryDate: string | null; savedAt: Date } }> {
  return prisma.$transaction(async (tx) => {
    // Trava de aviso por organização: duas gravações simultâneas da mesma
    // organização passam uma de cada vez, então a verificação de duplicata
    // abaixo não corre o risco de as duas lerem antes de qualquer gravação.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId}))`;

    // Mesmo CSV salvo de novo para a MESMA data de inventário? A conferência
    // vem antes de reservar vaga, para duplicata recusada não consumir o
    // contador do limite de 50. Conteúdo igual em data diferente é legítimo
    // (inventários de dias distintos podem ter valores iguais) e passa.
    const fp = datasetFingerprint(record.dataset);
    if (fp) {
      const dateKey = inventoryDateKey(record.inventoryDate);
      const existing = await tx.divergenceAnalysis.findMany({
        where: { organizationId },
        select: { id: true, name: true, inventoryDate: true, savedAt: true, dataset: true },
      });
      const dup = existing.find(
        (r) => datasetFingerprint(r.dataset) === fp && inventoryDateKey(r.inventoryDate) === dateKey,
      );
      if (dup) return { duplicate: { id: dup.id, name: dup.name, inventoryDate: dup.inventoryDate, savedAt: dup.savedAt } };
    }

    const reserved = await tx.$queryRaw<Array<{ analysis_count: number }>>`
      INSERT INTO divergence_analyses_meta (organization_id, analysis_count)
      VALUES (${organizationId}::uuid, 1)
      ON CONFLICT (organization_id) DO UPDATE
        SET analysis_count = divergence_analyses_meta.analysis_count + 1
        WHERE divergence_analyses_meta.analysis_count < ${MAX_ANALISES}
      RETURNING analysis_count`;
    if (!reserved.length) return "LIMIT_REACHED";

    const id = `da-${randomUUID()}`;
    try {
      const created = await tx.divergenceAnalysis.create({
        data: {
          id,
          organizationId,
          name: record.name,
          inventoryDate: record.inventoryDate ?? null,
          productCount: record.productCount,
          dataset: record.dataset as object,
        },
      });
      return toRecord(created, true) as SavedAnalysis;
    } catch (err) {
      await tx.$executeRaw`
        UPDATE divergence_analyses_meta
        SET analysis_count = GREATEST(analysis_count - 1, 0)
        WHERE organization_id = ${organizationId}::uuid`;
      throw err;
    }
  });
}

/** Remove uma análise da organização e devolve a vaga no contador. */
export async function removeDivergenceAnalysis(organizationId: string, id: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const removed = await tx.divergenceAnalysis.deleteMany({
      where: { id, organizationId },
    });
    if (!removed.count) return false;
    await tx.$executeRaw`
      UPDATE divergence_analyses_meta
      SET analysis_count = GREATEST(analysis_count - 1, 0)
      WHERE organization_id = ${organizationId}::uuid`;
    return true;
  });
}
