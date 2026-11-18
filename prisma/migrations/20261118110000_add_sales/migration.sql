-- CreateEnum
CREATE TYPE "SalesImportStatus" AS ENUM ('PENDING', 'APPLIED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "SalesApplyMode" AS ENUM ('ADD', 'REPLACE');

-- CreateTable
CREATE TABLE "sales_imports" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "file_hash" TEXT,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SalesImportStatus" NOT NULL DEFAULT 'PENDING',
    "period_start" DATE,
    "period_end" DATE,
    "stores" TEXT[],
    "total_rows" INTEGER NOT NULL,
    "error_rows" INTEGER NOT NULL,
    "new_rows" INTEGER NOT NULL DEFAULT 0,
    "duplicate_rows" INTEGER NOT NULL DEFAULT 0,
    "conflicting_rows" INTEGER NOT NULL DEFAULT 0,
    "conflict_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "unmapped_plus" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB,
    "applied_at" TIMESTAMP(3),
    "applied_mode" "SalesApplyMode",

    CONSTRAINT "sales_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "plu" TEXT NOT NULL,
    "description" TEXT,
    "sold_at" DATE NOT NULL,
    "store" TEXT,
    "coupon_number" TEXT,
    "pdv" TEXT,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "total_value" DECIMAL(15,2) NOT NULL,
    "row_hash" TEXT NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_organization_id_sold_at_store_idx" ON "sales"("organization_id", "sold_at", "store");

-- CreateIndex
CREATE INDEX "sales_organization_id_plu_sold_at_idx" ON "sales"("organization_id", "plu", "sold_at");

-- CreateIndex
CREATE INDEX "sales_organization_id_row_hash_idx" ON "sales"("organization_id", "row_hash");

-- CreateIndex
CREATE INDEX "sales_import_id_idx" ON "sales"("import_id");

-- CreateIndex
CREATE INDEX "sales_imports_organization_id_imported_at_idx" ON "sales_imports"("organization_id", "imported_at" DESC);

-- CreateIndex
CREATE INDEX "sales_imports_organization_id_file_hash_idx" ON "sales_imports"("organization_id", "file_hash");

-- AddForeignKey
ALTER TABLE "sales_imports" ADD CONSTRAINT "sales_imports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "sales_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
