UPDATE "users"
SET "role" = 'OWNER'
WHERE "organization_id" IS NOT NULL;
