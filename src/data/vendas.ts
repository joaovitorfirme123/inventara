import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { VendaCsvRow } from "@/lib/vendas-csv";

const IMPORT_BATCH_SIZE = 500;
const MAX_PAYLOAD_CHARS = 6_000_000;

export const SEM_CADASTRO = "Sem cadastro";
const SEM_GRUPO = "Sem grupo";
const SEM_SUBGRUPO = "Sem subgrupo";

export const PAYLOAD_TOO_LARGE_MESSAGE =
  "O arquivo é grande demais para a revisão de importação. Divida o período em arquivos menores.";

type ScopedRow = VendaCsvRow;

type StagingDiagnostics = {
  newRows: number;
  duplicateRows: number;
  conflictingRows: number;
  conflictValue: number;
};

function scopeStores(rows: ScopedRow[]) {
  const stores = [...new Set(rows.map((row) => row.store))];
  const everyRowHasStore = stores.every((store) => store !== null);
  return { stores, everyRowHasStore };
}

function scopeWhere(
  organizationId: string,
  periodStart: string,
  periodEnd: string,
  stores: (string | null)[],
  everyRowHasStore: boolean,
): Prisma.Sql {
  const conditions = [
    Prisma.sql`s."organization_id" = ${organizationId}::uuid`,
    Prisma.sql`s."sold_at" >= ${periodStart}::date`,
    Prisma.sql`s."sold_at" <= ${periodEnd}::date`,
  ];
  if (everyRowHasStore) {
    conditions.push(Prisma.sql`s."store" = ANY(${stores as string[]})`);
  }
  return Prisma.join(conditions, " AND ");
}

async function computeDiagnostics(
  organizationId: string,
  rows: ScopedRow[],
): Promise<StagingDiagnostics & { periodStart: string | null; periodEnd: string | null; storeList: string[] }> {
  if (rows.length === 0) {
    return {
      periodStart: null,
      periodEnd: null,
      storeList: [],
      newRows: 0,
      duplicateRows: 0,
      conflictingRows: 0,
      conflictValue: 0,
    };
  }

  const sortedDates = rows.map((row) => row.soldAt).sort();
  const periodStart = sortedDates[0];
  const periodEnd = sortedDates[sortedDates.length - 1];
  const { stores, everyRowHasStore } = scopeStores(rows);
  const where = scopeWhere(organizationId, periodStart, periodEnd, stores, everyRowHasStore);

  const dbCounts = new Map<string, number>();
  const dbRows = await prisma.$queryRaw<Array<{ h: string; c: number }>>(Prisma.sql`
    SELECT s."row_hash" AS "h", COUNT(*)::int AS "c"
    FROM "sales" s
    WHERE ${where}
    GROUP BY s."row_hash"
  `);
  for (const row of dbRows) dbCounts.set(row.h, row.c);

  const fileCounts = new Map<string, number>();
  for (const row of rows) {
    fileCounts.set(row.rowHash, (fileCounts.get(row.rowHash) ?? 0) + 1);
  }

  let newRows = 0;
  let duplicateRows = 0;
  for (const [hash, fileCount] of fileCounts) {
    const inDb = dbCounts.get(hash) ?? 0;
    newRows += Math.max(0, fileCount - inDb);
    duplicateRows += Math.min(fileCount, inDb);
  }

  const fileHashes = [...fileCounts.keys()];
  const conflicting = await prisma.$queryRaw<Array<{ c: number; v: number | null }>>(Prisma.sql`
    SELECT COUNT(*)::int AS "c", COALESCE(SUM(s."total_value"), 0)::float AS "v"
    FROM "sales" s
    WHERE ${where}
      AND NOT (s."row_hash" = ANY(${fileHashes}::text[]))
  `);

  return {
    periodStart,
    periodEnd,
    storeList: stores.filter((store): store is string => store !== null),
    newRows,
    duplicateRows,
    conflictingRows: conflicting[0]?.c ?? 0,
    conflictValue: conflicting[0]?.v ?? 0,
  };
}

export type StageSalesResult = {
  importId: string;
  totalRows: number;
  errorRows: number;
  newRows: number;
  duplicateRows: number;
  conflictingRows: number;
  conflictValue: number;
  unmappedPlus: number;
  periodStart: string | null;
  periodEnd: string | null;
  stores: string[];
};

export async function stageSalesImport(input: {
  organizationId: string;
  filename: string;
  fileHash: string;
  rows: VendaCsvRow[];
  errorRows: number;
}): Promise<StageSalesResult | "PAYLOAD_TOO_LARGE"> {
  const payload = JSON.stringify(input.rows);
  if (payload.length > MAX_PAYLOAD_CHARS) {
    return "PAYLOAD_TOO_LARGE";
  }

  const diagnostics = await computeDiagnostics(input.organizationId, input.rows);

  const distinctPlus = [...new Set(input.rows.map((row) => row.plu))];
  const found = distinctPlus.length
    ? await prisma.product.findMany({
        where: { organizationId: input.organizationId, plu: { in: distinctPlus } },
        select: { plu: true },
      })
    : [];
  const foundSet = new Set(found.map((product) => product.plu));
  const unmappedPlus = distinctPlus.filter((plu) => !foundSet.has(plu)).length;

  const record = await prisma.salesImport.create({
    data: {
      organizationId: input.organizationId,
      filename: input.filename,
      fileHash: input.fileHash,
      status: "PENDING",
      periodStart: diagnostics.periodStart ? new Date(`${diagnostics.periodStart}T00:00:00Z`) : null,
      periodEnd: diagnostics.periodEnd ? new Date(`${diagnostics.periodEnd}T00:00:00Z`) : null,
      stores: diagnostics.storeList,
      totalRows: input.rows.length + input.errorRows,
      errorRows: input.errorRows,
      newRows: diagnostics.newRows,
      duplicateRows: diagnostics.duplicateRows,
      conflictingRows: diagnostics.conflictingRows,
      conflictValue: String(diagnostics.conflictValue.toFixed(2)),
      unmappedPlus,
      payload: input.rows as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    importId: record.id,
    totalRows: record.totalRows,
    errorRows: input.errorRows,
    newRows: diagnostics.newRows,
    duplicateRows: diagnostics.duplicateRows,
    conflictingRows: diagnostics.conflictingRows,
    conflictValue: diagnostics.conflictValue,
    unmappedPlus,
    periodStart: diagnostics.periodStart,
    periodEnd: diagnostics.periodEnd,
    stores: diagnostics.storeList,
  };
}

export type ApplySalesResult = {
  insertedRows: number;
  replacedRows: number;
  periodStart: string | null;
  periodEnd: string | null;
};

export async function applySalesImport(
  organizationId: string,
  importId: string,
  mode: "ADD" | "REPLACE",
): Promise<ApplySalesResult | "NOT_FOUND" | "NOT_PENDING" | "NO_PAYLOAD"> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(importId)) {
    return "NOT_FOUND";
  }

  const record = await prisma.salesImport.findFirst({
    where: { id: importId, organizationId },
  });

  if (!record) return "NOT_FOUND";
  if (record.status !== "PENDING") return "NOT_PENDING";

  const rows = (record.payload ?? null) as unknown as VendaCsvRow[] | null;
  if (!Array.isArray(rows)) return "NO_PAYLOAD";

  return prisma.$transaction(async (transaction) => {
    const sortedDates = rows.map((row) => row.soldAt).sort();
    const periodStart = sortedDates[0] ?? null;
    const periodEnd = sortedDates[sortedDates.length - 1] ?? null;
    const { stores, everyRowHasStore } = scopeStores(rows);

    let replacedRows = 0;
    let toInsert: VendaCsvRow[] = rows;

    if (periodStart && periodEnd) {
      const where = scopeWhere(organizationId, periodStart, periodEnd, stores, everyRowHasStore);

      if (mode === "REPLACE") {
        const deleted = await transaction.$executeRaw(Prisma.sql`
          DELETE FROM "sales" s WHERE ${where}
        `);
        replacedRows = Number(deleted);
      } else {
        const dbCounts = new Map<string, number>();
        const dbRows = await transaction.$queryRaw<Array<{ h: string; c: number }>>(Prisma.sql`
          SELECT s."row_hash" AS "h", COUNT(*)::int AS "c"
          FROM "sales" s
          WHERE ${where}
          GROUP BY s."row_hash"
        `);
        for (const row of dbRows) dbCounts.set(row.h, row.c);

        const seen = new Map<string, number>();
        toInsert = rows.filter((row) => {
          const copyIndex = seen.get(row.rowHash) ?? 0;
          seen.set(row.rowHash, copyIndex + 1);
          return copyIndex >= (dbCounts.get(row.rowHash) ?? 0);
        });
      }
    }

    let insertedRows = 0;
    for (let offset = 0; offset < toInsert.length; offset += IMPORT_BATCH_SIZE) {
      const batch = toInsert.slice(offset, offset + IMPORT_BATCH_SIZE);
      const created = await transaction.sale.createMany({
        data: batch.map((row) => ({
          id: randomUUID(),
          organizationId,
          importId: record.id,
          plu: row.plu,
          description: row.description,
          soldAt: new Date(`${row.soldAt}T00:00:00Z`),
          store: row.store,
          couponNumber: row.couponNumber,
          pdv: row.pdv,
          unitPrice: row.unitPrice,
          quantity: row.quantity,
          totalValue: row.totalValue,
          rowHash: row.rowHash,
        })),
      });
      insertedRows += created.count;
    }

    await transaction.salesImport.update({
      where: { id: record.id },
      data: {
        status: "APPLIED",
        appliedAt: new Date(),
        appliedMode: mode,
        newRows: insertedRows,
        duplicateRows: rows.length - insertedRows,
        conflictingRows: 0,
        payload: Prisma.JsonNull,
      },
    });

    return { insertedRows, replacedRows, periodStart, periodEnd };
  }, { maxWait: 10_000, timeout: 60_000 });
}

export async function discardSalesImport(organizationId: string, importId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(importId)) {
    return null;
  }

  const record = await prisma.salesImport.findFirst({
    where: { id: importId, organizationId },
  });

  if (!record) return null;

  // PENDING: nada foi gravado em vendas, basta remover o registro de revisão.
  // APPLIED: a remoção em cascata apaga somente as linhas gravadas por este lote.
  await prisma.salesImport.delete({ where: { id: record.id } });

  return record;
}

export type SalesFilters = {
  from?: string;
  to?: string;
  section?: string;
  group?: string;
  subgroup?: string;
};

function buildWhere(organizationId: string, filters: SalesFilters): Prisma.Sql {
  const conditions = [Prisma.sql`s."organization_id" = ${organizationId}::uuid`];

  if (filters.from) conditions.push(Prisma.sql`s."sold_at" >= ${filters.from}::date`);
  if (filters.to) conditions.push(Prisma.sql`s."sold_at" <= ${filters.to}::date`);
  if (filters.section) {
    conditions.push(
      Prisma.sql`COALESCE(NULLIF(BTRIM(p."section"), ''), ${SEM_CADASTRO}) = ${filters.section}`,
    );
  }
  if (filters.group) {
    conditions.push(
      Prisma.sql`COALESCE(NULLIF(BTRIM(p."group"), ''), ${SEM_GRUPO}) = ${filters.group}`,
    );
  }
  if (filters.subgroup) {
    conditions.push(
      Prisma.sql`COALESCE(NULLIF(BTRIM(p."subgroup"), ''), ${SEM_SUBGRUPO}) = ${filters.subgroup}`,
    );
  }

  return Prisma.join(conditions, " AND ");
}

const salesJoin = Prisma.sql`
  FROM "sales" s
  LEFT JOIN "products" p
    ON p."organization_id" = s."organization_id" AND p."plu" = s."plu"
`;

export type SalesSummaryRow = {
  section: string;
  group: string;
  subgroup: string;
  totalValue: number;
  totalQuantity: number;
  pluCount: number;
  rowCount: number;
};

export async function getSalesSummary(
  organizationId: string,
  filters: SalesFilters,
): Promise<SalesSummaryRow[]> {
  const where = buildWhere(organizationId, filters);
  const rows = await prisma.$queryRaw<Array<{
    section: string;
    group: string;
    subgroup: string;
    total_value: number;
    total_quantity: number;
    plu_count: number;
    row_count: number;
  }>>(Prisma.sql`
    SELECT
      COALESCE(NULLIF(BTRIM(p."section"), ''), ${SEM_CADASTRO}) AS "section",
      COALESCE(NULLIF(BTRIM(p."group"), ''), ${SEM_GRUPO}) AS "group",
      COALESCE(NULLIF(BTRIM(p."subgroup"), ''), ${SEM_SUBGRUPO}) AS "subgroup",
      SUM(s."total_value")::float AS "total_value",
      SUM(s."quantity")::float AS "total_quantity",
      COUNT(DISTINCT s."plu")::int AS "plu_count",
      COUNT(*)::int AS "row_count"
    ${salesJoin}
    WHERE ${where}
    GROUP BY 1, 2, 3
    ORDER BY 1, 2, 3
  `);

  return rows.map((row) => ({
    section: row.section,
    group: row.group,
    subgroup: row.subgroup,
    totalValue: row.total_value,
    totalQuantity: row.total_quantity,
    pluCount: row.plu_count,
    rowCount: row.row_count,
  }));
}

export type SalesTotals = {
  totalValue: number;
  totalQuantity: number;
  pluCount: number;
  daysCount: number;
  rowCount: number;
};

export async function getSalesTotals(
  organizationId: string,
  filters: SalesFilters,
): Promise<SalesTotals> {
  const where = buildWhere(organizationId, filters);
  const rows = await prisma.$queryRaw<Array<{
    total_value: number | null;
    total_quantity: number | null;
    plu_count: number;
    days_count: number;
    row_count: number;
  }>>(Prisma.sql`
    SELECT
      SUM(s."total_value")::float AS "total_value",
      SUM(s."quantity")::float AS "total_quantity",
      COUNT(DISTINCT s."plu")::int AS "plu_count",
      COUNT(DISTINCT s."sold_at")::int AS "days_count",
      COUNT(*)::int AS "row_count"
    ${salesJoin}
    WHERE ${where}
  `);
  const row = rows[0];

  return {
    totalValue: row?.total_value ?? 0,
    totalQuantity: row?.total_quantity ?? 0,
    pluCount: row?.plu_count ?? 0,
    daysCount: row?.days_count ?? 0,
    rowCount: row?.row_count ?? 0,
  };
}

export type SalesFilterOptions = {
  sections: string[];
  groups: string[];
  subgroups: string[];
};

export async function getSalesFilterOptions(
  organizationId: string,
  filters: SalesFilters,
): Promise<SalesFilterOptions> {
  const periodOnly = buildWhere(organizationId, { from: filters.from, to: filters.to });

  const sectionsPromise = prisma.$queryRaw<Array<{ value: string }>>(Prisma.sql`
    SELECT DISTINCT COALESCE(NULLIF(BTRIM(p."section"), ''), ${SEM_CADASTRO}) AS "value"
    ${salesJoin}
    WHERE ${periodOnly}
    ORDER BY 1
  `);

  const groupsWhere = buildWhere(organizationId, {
    from: filters.from,
    to: filters.to,
    section: filters.section,
  });
  const groupsPromise = prisma.$queryRaw<Array<{ value: string }>>(Prisma.sql`
    SELECT DISTINCT COALESCE(NULLIF(BTRIM(p."group"), ''), ${SEM_GRUPO}) AS "value"
    ${salesJoin}
    WHERE ${groupsWhere}
    ORDER BY 1
  `);

  const subgroupsWhere = buildWhere(organizationId, {
    from: filters.from,
    to: filters.to,
    section: filters.section,
    group: filters.group,
  });
  const subgroupsPromise = prisma.$queryRaw<Array<{ value: string }>>(Prisma.sql`
    SELECT DISTINCT COALESCE(NULLIF(BTRIM(p."subgroup"), ''), ${SEM_SUBGRUPO}) AS "value"
    ${salesJoin}
    WHERE ${subgroupsWhere}
    ORDER BY 1
  `);

  const [sections, groups, subgroups] = await Promise.all([
    sectionsPromise,
    groupsPromise,
    subgroupsPromise,
  ]);

  return {
    sections: sections.map((row) => row.value),
    groups: groups.map((row) => row.value),
    subgroups: subgroups.map((row) => row.value),
  };
}

export async function getSalesRange(organizationId: string) {
  const rows = await prisma.$queryRaw<Array<{ min: string | null; max: string | null }>>(Prisma.sql`
    SELECT MIN("sold_at")::text AS "min", MAX("sold_at")::text AS "max"
    FROM "sales"
    WHERE "organization_id" = ${organizationId}::uuid
  `);
  return rows[0] ?? { min: null, max: null };
}

export function listSalesImports(organizationId: string) {
  return prisma.salesImport.findMany({
    where: { organizationId, status: { not: "DISCARDED" } },
    orderBy: [{ importedAt: "desc" }, { id: "desc" }],
    take: 20,
  });
}

export async function getSalesImportSummary(organizationId: string, importId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(importId)) {
    return null;
  }

  const record = await prisma.salesImport.findFirst({
    where: { id: importId, organizationId },
  });

  if (!record) return null;

  return {
    importId: record.id,
    filename: record.filename,
    status: record.status,
    totalRows: record.totalRows,
    errorRows: record.errorRows,
    newRows: record.newRows,
    duplicateRows: record.duplicateRows,
    conflictingRows: record.conflictingRows,
    conflictValue: Number(record.conflictValue),
    unmappedPlus: record.unmappedPlus,
    periodStart: record.periodStart ? record.periodStart.toISOString().slice(0, 10) : null,
    periodEnd: record.periodEnd ? record.periodEnd.toISOString().slice(0, 10) : null,
    stores: record.stores,
  };
    }
