-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('INSERTED', 'UPDATED', 'ERROR');

-- CreateTable
CREATE TABLE "import_rows" (
    "id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "status" "ImportRowStatus" NOT NULL,
    "plu" TEXT,
    "description" TEXT,
    "field" TEXT,
    "message" TEXT,
    "product_id" UUID,

    CONSTRAINT "import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "import_rows_import_id_row_number_key" ON "import_rows"("import_id", "row_number");

-- CreateIndex
CREATE INDEX "import_rows_import_id_status_idx" ON "import_rows"("import_id", "status");

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
