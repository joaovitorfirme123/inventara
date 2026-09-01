ALTER TABLE "inventory_plans" ADD COLUMN "responsible_name" TEXT;

UPDATE "inventory_plans" AS plans
SET "responsible_name" = users."name"
FROM "users" AS users
WHERE plans."responsible_id" = users."id";

ALTER TABLE "inventory_plans" DROP CONSTRAINT "inventory_plans_responsible_id_fkey";
ALTER TABLE "inventory_plans" DROP COLUMN "responsible_id";
