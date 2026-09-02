-- CreateTable
CREATE TABLE "inventory_goals" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "target_percentage" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_coverage" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "total_skus" INTEGER NOT NULL,
    "counted_skus" INTEGER NOT NULL,
    "coverage_percentage" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_coverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_goals_organization_id_year_section_key" ON "inventory_goals"("organization_id", "year", "section");
CREATE INDEX "inventory_goals_organization_id_year_idx" ON "inventory_goals"("organization_id", "year");
CREATE UNIQUE INDEX "inventory_coverage_organization_id_year_month_section_key" ON "inventory_coverage"("organization_id", "year", "month", "section");
CREATE INDEX "inventory_coverage_organization_id_year_month_idx" ON "inventory_coverage"("organization_id", "year", "month");

-- AddForeignKey
ALTER TABLE "inventory_goals" ADD CONSTRAINT "inventory_goals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_coverage" ADD CONSTRAINT "inventory_coverage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
