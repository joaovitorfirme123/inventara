import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import type { CsvProduct } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

const IMPORT_BATCH_SIZE = 500;

export type ImportResult = {
  importId: string;
  processedRows: number;
  insertedRows: number;
  updatedRows: number;
  errorRows: number;
};

export async function importProducts(
  input: {
    organizationId: string;
    filename: string;
    fileHash: string;
    rows: CsvProduct[];
    errorRows: number;
  },
): Promise<ImportResult> {
  return prisma.$transaction(async (transaction) => {
    let insertedRows = 0;
    let updatedRows = 0;
    const importRecord = await transaction.importRecord.create({
      data: {
        organizationId: input.organizationId,
        filename: input.filename,
        fileHash: input.fileHash,
        totalRows: input.rows.length + input.errorRows,
        insertedRows: 0,
        updatedRows: 0,
        errorRows: input.errorRows,
      },
    });

    for (let offset = 0; offset < input.rows.length; offset += IMPORT_BATCH_SIZE) {
      const batch = input.rows.slice(offset, offset + IMPORT_BATCH_SIZE);
      const existing = await transaction.product.findMany({
        where: {
          organizationId: input.organizationId,
          plu: { in: batch.map((row) => row.plu) },
        },
        select: { plu: true },
      });
      const existingPlus = new Set(existing.map(({ plu }) => plu));
      const values = batch.map((row) => Prisma.sql`(
        ${randomUUID()}::uuid,
        ${input.organizationId}::uuid,
        ${row.plu},
        ${row.barcode},
        ${row.description},
        ${row.section},
        ${row.group},
        ${row.subgroup},
        ${row.lastInventory}::date,
        ${row.currentStock}::numeric,
        NOW(),
        NOW()
      )`);

      await transaction.$executeRaw(Prisma.sql`
        INSERT INTO "products" (
          "id",
          "organization_id",
          "plu",
          "barcode",
          "description",
          "section",
          "group",
          "subgroup",
          "last_inventory",
          "current_stock",
          "created_at",
          "updated_at"
        )
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("organization_id", "plu") DO UPDATE SET
          "barcode" = EXCLUDED."barcode",
          "description" = EXCLUDED."description",
          "section" = EXCLUDED."section",
          "group" = EXCLUDED."group",
          "subgroup" = EXCLUDED."subgroup",
          "last_inventory" = EXCLUDED."last_inventory",
          "current_stock" = EXCLUDED."current_stock",
          "updated_at" = NOW()
      `);

      const products = await transaction.product.findMany({
        where: {
          organizationId: input.organizationId,
          plu: { in: batch.map((row) => row.plu) },
        },
        select: { id: true, plu: true },
      });
      const productIds = new Map(products.map((product) => [product.plu, product.id]));
      const snapshots = batch.map((row) => Prisma.sql`(
        ${randomUUID()}::uuid,
        ${input.organizationId}::uuid,
        ${productIds.get(row.plu)}::uuid,
        ${importRecord.id}::uuid,
        ${row.currentStock}::numeric,
        NOW()
      )`);

      await transaction.$executeRaw(Prisma.sql`
        INSERT INTO "stock_history" (
          "id",
          "organization_id",
          "product_id",
          "import_id",
          "stock",
          "recorded_at"
        )
        VALUES ${Prisma.join(snapshots)}
      `);

      updatedRows += existingPlus.size;
      insertedRows += batch.length - existingPlus.size;
    }

    await transaction.importRecord.update({
      where: { id: importRecord.id },
      data: { insertedRows, updatedRows },
    });

    return {
      importId: importRecord.id,
      processedRows: input.rows.length + input.errorRows,
      insertedRows,
      updatedRows,
      errorRows: input.errorRows,
    };
  }, { maxWait: 10_000, timeout: 60_000 });
}
