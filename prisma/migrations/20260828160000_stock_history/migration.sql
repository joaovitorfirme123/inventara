-- CreateTable
CREATE TABLE "stock_history" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "stock" DECIMAL(15,3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_history_import_id_product_id_key" ON "stock_history"("import_id", "product_id");

-- CreateIndex
CREATE INDEX "stock_history_organization_id_product_id_recorded_at_idx" ON "stock_history"("organization_id", "product_id", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "stock_history_organization_id_import_id_idx" ON "stock_history"("organization_id", "import_id");

-- AddForeignKey
ALTER TABLE "stock_history" ADD CONSTRAINT "stock_history_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_history" ADD CONSTRAINT "stock_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_history" ADD CONSTRAINT "stock_history_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
