-- CreateTable
CREATE TABLE "import_templates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_template_revisions" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "configuration" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_template_revisions_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "imports" ADD COLUMN "template_revision_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "import_templates_organization_id_name_key" ON "import_templates"("organization_id", "name");
CREATE INDEX "import_templates_organization_id_updated_at_idx" ON "import_templates"("organization_id", "updated_at" DESC);
CREATE UNIQUE INDEX "import_template_revisions_template_id_version_key" ON "import_template_revisions"("template_id", "version");
CREATE INDEX "import_template_revisions_template_id_version_idx" ON "import_template_revisions"("template_id", "version" DESC);
CREATE INDEX "imports_template_revision_id_idx" ON "imports"("template_revision_id");

-- AddForeignKey
ALTER TABLE "import_templates" ADD CONSTRAINT "import_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_template_revisions" ADD CONSTRAINT "import_template_revisions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "import_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "imports" ADD CONSTRAINT "imports_template_revision_id_fkey" FOREIGN KEY ("template_revision_id") REFERENCES "import_template_revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
