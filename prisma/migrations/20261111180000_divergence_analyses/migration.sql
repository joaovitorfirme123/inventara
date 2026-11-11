-- CreateTable
CREATE TABLE "divergence_analyses" (
    "id" TEXT NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "inventory_date" TEXT,
    "product_count" INTEGER NOT NULL,
    "dataset" JSONB NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "divergence_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "divergence_analyses_meta" (
    "organization_id" UUID NOT NULL,
    "analysis_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "divergence_analyses_meta_pkey" PRIMARY KEY ("organization_id")
);

-- CreateIndex
CREATE INDEX "divergence_analyses_organization_id_saved_at_idx" ON "divergence_analyses"("organization_id", "saved_at" DESC);

-- AddForeignKey
ALTER TABLE "divergence_analyses" ADD CONSTRAINT "divergence_analyses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divergence_analyses_meta" ADD CONSTRAINT "divergence_analyses_meta_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
