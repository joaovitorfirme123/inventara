-- AlterTable
ALTER TABLE "imports" ADD COLUMN     "file_hash" TEXT;

-- CreateIndex
CREATE INDEX "imports_organization_id_file_hash_idx" ON "imports"("organization_id", "file_hash");
