import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import type { CsvProduct } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

const IMPORT_BATCH_SIZE = 500;

export type ImportResult = {
  processedRows: number;
  insertedRows: number;
  updatedRows: number;
  errorRows: number;
};

export async function importProducts(
  organizationId: string,
  rows: CsvProduct[],
  errorRows: number,
): Promise<ImportResult> {
  let insertedRows = 0;
  let updatedRows = 0;

  for (let offset = 0; offset < rows.length; offset += IMPORT_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + IMPORT_BATCH_SIZE);
    const existing = await prisma.product.findMany({
      where: {
        organizationId,
        plu: { in: batch.map((row) => row.plu) },
      },
      select: { plu: true },
    });
    const existingPlus = new Set(existing.map(({ plu }) => plu));
    const values = batch.map((row) => Prisma.sql`(
      ${randomUUID()}::uuid,
      ${organizationId}::uuid,
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

    await prisma.$executeRaw(Prisma.sql`
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

    updatedRows += existingPlus.size;
    insertedRows += batch.length - existingPlus.size;
  }

  return {
    processedRows: rows.length + errorRows,
    insertedRows,
    updatedRows,
    errorRows,
  };
}
