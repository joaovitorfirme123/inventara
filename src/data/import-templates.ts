import { randomUUID } from "node:crypto";
import type { CsvField, CsvImportConfig } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

const csvFields = new Set<CsvField>([
  "plu", "barcode", "description", "section", "group", "subgroup", "lastInventory", "currentStock",
]);

export type ImportTemplateConfiguration = CsvImportConfig;

export type ImportTemplateSummary = {
  id: string;
  name: string;
  revisionId: string;
  version: number;
  configuration: ImportTemplateConfiguration;
};

export function parseImportTemplateConfiguration(value: unknown): ImportTemplateConfiguration | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { delimiter?: unknown; columns?: unknown; requiredFields?: unknown };
  const columns = candidate.columns && typeof candidate.columns === "object"
    ? Object.fromEntries(Object.entries(candidate.columns).filter(([field, source]) => csvFields.has(field as CsvField) && typeof source === "string" && source.trim())) as Partial<Record<CsvField, string>>
    : {};
  const requiredFields = Array.isArray(candidate.requiredFields)
    ? candidate.requiredFields.filter((field): field is CsvField => typeof field === "string" && csvFields.has(field as CsvField))
    : [];
  const delimiter = candidate.delimiter === ";" || candidate.delimiter === "," || candidate.delimiter === "\t"
    ? candidate.delimiter
    : undefined;
  if (
    !columns.plu ||
    !columns.description ||
    !columns.currentStock ||
    !requiredFields.includes("plu") ||
    !requiredFields.includes("description") ||
    !requiredFields.includes("currentStock")
  ) return null;
  return { delimiter, columns, requiredFields };
}

function mapTemplate(template: {
  id: string;
  name: string;
  revisions: Array<{ id: string; version: number; configuration: unknown }>;
}): ImportTemplateSummary | null {
  const revision = template.revisions[0];
  const configuration = revision ? parseImportTemplateConfiguration(revision.configuration) : null;
  return revision && configuration
    ? { id: template.id, name: template.name, revisionId: revision.id, version: revision.version, configuration }
    : null;
}

export async function listImportTemplates(organizationId: string) {
  const templates = await prisma.importTemplate.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      revisions: {
        orderBy: { version: "desc" },
        take: 1,
        select: { id: true, version: true, configuration: true },
      },
    },
  });
  return templates.map(mapTemplate).filter((template): template is ImportTemplateSummary => template !== null);
}

export async function getImportTemplateRevision(organizationId: string, revisionId: string) {
  const revision = await prisma.importTemplateRevision.findFirst({
    where: { id: revisionId, template: { organizationId } },
    select: { id: true, templateId: true, version: true, configuration: true },
  });
  if (!revision) return null;
  const configuration = parseImportTemplateConfiguration(revision.configuration);
  return configuration ? { ...revision, configuration } : null;
}

export async function saveImportTemplate(input: {
  organizationId: string;
  actorId: string;
  templateId?: string;
  name: string;
  configuration: ImportTemplateConfiguration;
}) {
  if (!input.name.trim() || !parseImportTemplateConfiguration(input.configuration)) {
    throw new Error("INVALID_TEMPLATE");
  }
  return prisma.$transaction(async (transaction) => {
    let template;
    let version = 1;
    if (input.templateId) {
      template = await transaction.importTemplate.findFirst({
        where: { id: input.templateId, organizationId: input.organizationId },
        select: { id: true },
      });
      if (!template) throw new Error("TEMPLATE_NOT_FOUND");
      const latest = await transaction.importTemplateRevision.findFirst({ where: { templateId: template.id }, orderBy: { version: "desc" }, select: { version: true } });
      version = (latest?.version ?? 0) + 1;
      await transaction.importTemplate.update({ where: { id: template.id }, data: { name: input.name.trim() } });
    } else {
      template = await transaction.importTemplate.create({ data: { id: randomUUID(), organizationId: input.organizationId, name: input.name.trim() }, select: { id: true } });
    }
    const revision = await transaction.importTemplateRevision.create({
      data: { templateId: template.id, version, configuration: input.configuration },
      select: { id: true, version: true },
    });
    await transaction.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorId: input.actorId,
        action: input.templateId ? "IMPORT_TEMPLATE_UPDATED" : "IMPORT_TEMPLATE_CREATED",
        entityType: "IMPORT_TEMPLATE",
        entityId: template.id,
        metadata: { name: input.name, revisionId: revision.id, version },
      },
    });
    return { templateId: template.id, revisionId: revision.id, version };
  }, { maxWait: 10_000, timeout: 30_000 });
}
