-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "plu" TEXT NOT NULL,
    "barcode" TEXT,
    "description" TEXT NOT NULL,
    "section" TEXT,
    "group" TEXT,
    "subgroup" TEXT,
    "last_inventory" DATE,
    "current_stock" DECIMAL(15,3) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "products_organization_id_description_idx" ON "products"("organization_id", "description");

-- CreateIndex
CREATE INDEX "products_organization_id_barcode_idx" ON "products"("organization_id", "barcode");

-- CreateIndex
CREATE INDEX "products_organization_id_section_group_subgroup_idx" ON "products"("organization_id", "section", "group", "subgroup");

-- CreateIndex
CREATE UNIQUE INDEX "products_organization_id_plu_key" ON "products"("organization_id", "plu");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
