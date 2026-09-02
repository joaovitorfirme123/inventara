import "dotenv/config";
import {
  getImportTemplateRevision,
  listImportTemplates,
  saveImportTemplate,
} from "../src/data/import-templates";
import type { CsvImportConfig } from "../src/lib/csv";
import { prisma } from "../src/lib/prisma";

const organizationAId = "11111111-1111-4111-8111-111111111111";
const organizationBId = "22222222-2222-4222-8222-222222222222";
const actorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const templateName = "Template versionado de teste";
const configuration: CsvImportConfig = {
  delimiter: ";" as const,
  columns: { plu: "SKU", description: "Nome", currentStock: "Quantidade" },
  requiredFields: ["plu", "description", "currentStock"],
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function testImportTemplates() {
  await prisma.importTemplate.deleteMany({ where: { name: templateName } });

  try {
    const first = await saveImportTemplate({
      organizationId: organizationAId,
      actorId,
      name: templateName,
      configuration,
    });
    const second = await saveImportTemplate({
      organizationId: organizationAId,
      actorId,
      templateId: first.templateId,
      name: templateName,
      configuration: { ...configuration, delimiter: "," },
    });

    assert(first.version === 1 && second.version === 2, "Template revisions were not versioned.");
    assert(await getImportTemplateRevision(organizationAId, second.revisionId), "Organization could not read its template revision.");
    assert(!(await getImportTemplateRevision(organizationBId, second.revisionId)), "Template crossed organization boundary.");

    const templates = await listImportTemplates(organizationAId);
    assert(templates.some((template) => template.id === first.templateId && template.version === 2), "Latest template revision was not listed.");
  } finally {
    const template = await prisma.importTemplate.findFirst({ where: { organizationId: organizationAId, name: templateName }, select: { id: true } });
    if (template) await prisma.auditLog.deleteMany({ where: { entityId: template.id } });
    await prisma.importTemplate.deleteMany({ where: { name: templateName } });
  }

  console.log("Import template configuration, versioning, and isolation passed.");
}

testImportTemplates()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
