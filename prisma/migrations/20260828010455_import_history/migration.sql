-- CreateTable
CREATE TABLE "imports" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_rows" INTEGER NOT NULL,
    "inserted_rows" INTEGER NOT NULL,
    "updated_rows" INTEGER NOT NULL,
    "error_rows" INTEGER NOT NULL,

    CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "imports_organization_id_imported_at_idx" ON "imports"("organization_id", "imported_at" DESC);

-- AddForeignKey
ALTER TABLE "imports" ADD CONSTRAINT "imports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
