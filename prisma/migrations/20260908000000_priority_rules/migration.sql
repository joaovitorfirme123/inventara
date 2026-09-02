-- CreateTable
CREATE TABLE "priority_rules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "priority_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priority_rule_revisions" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "configuration" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "priority_rule_revisions_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "inventory_plans" ADD COLUMN "priority_rule_revision_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "priority_rules_organization_id_key" ON "priority_rules"("organization_id");
CREATE UNIQUE INDEX "priority_rule_revisions_rule_id_version_key" ON "priority_rule_revisions"("rule_id", "version");
CREATE INDEX "priority_rule_revisions_rule_id_version_idx" ON "priority_rule_revisions"("rule_id", "version" DESC);
CREATE INDEX "inventory_plans_priority_rule_revision_id_idx" ON "inventory_plans"("priority_rule_revision_id");

-- AddForeignKey
ALTER TABLE "priority_rules" ADD CONSTRAINT "priority_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "priority_rule_revisions" ADD CONSTRAINT "priority_rule_revisions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "priority_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_plans" ADD CONSTRAINT "inventory_plans_priority_rule_revision_id_fkey" FOREIGN KEY ("priority_rule_revision_id") REFERENCES "priority_rule_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
