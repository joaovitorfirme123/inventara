-- CreateEnum
CREATE TYPE "InventoryPlanStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "inventory_plans" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "section" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "subgroup" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "priority_score" DOUBLE PRECISION NOT NULL,
    "total_skus" INTEGER NOT NULL,
    "pending_skus" INTEGER NOT NULL,
    "planned_date" DATE,
    "responsible_id" UUID,
    "status" "InventoryPlanStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_plans_organization_id_status_planned_date_idx" ON "inventory_plans"("organization_id", "status", "planned_date");

-- CreateIndex
CREATE INDEX "inventory_plans_organization_id_section_group_subgroup_idx" ON "inventory_plans"("organization_id", "section", "group", "subgroup");

-- AddForeignKey
ALTER TABLE "inventory_plans" ADD CONSTRAINT "inventory_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_plans" ADD CONSTRAINT "inventory_plans_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
