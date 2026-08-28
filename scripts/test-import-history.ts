import "dotenv/config";
import { createImportRecord, listImportsByOrganization } from "../src/data/imports";
import { prisma } from "../src/lib/prisma";

const organizationAId = "11111111-1111-4111-8111-111111111111";
const organizationBId = "22222222-2222-4222-8222-222222222222";
const filenames = [
  "history-a-old.csv",
  "history-a-new.csv",
  "history-b.csv",
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function testImportHistory() {
  await prisma.importRecord.deleteMany({
    where: { filename: { in: filenames } },
  });

  try {
    const oldImport = await createImportRecord({
      organizationId: organizationAId,
      filename: filenames[0],
      totalRows: 100,
      insertedRows: 20,
      updatedRows: 75,
      errorRows: 5,
    });
    const newImport = await createImportRecord({
      organizationId: organizationAId,
      filename: filenames[1],
      totalRows: 80,
      insertedRows: 10,
      updatedRows: 70,
      errorRows: 0,
    });
    await createImportRecord({
      organizationId: organizationBId,
      filename: filenames[2],
      totalRows: 999,
      insertedRows: 999,
      updatedRows: 0,
      errorRows: 0,
    });

    await Promise.all([
      prisma.importRecord.update({
        where: { id: oldImport.id },
        data: { importedAt: new Date("2026-08-26T10:00:00Z") },
      }),
      prisma.importRecord.update({
        where: { id: newImport.id },
        data: { importedAt: new Date("2026-08-27T10:00:00Z") },
      }),
    ]);

    const history = await listImportsByOrganization(organizationAId);
    const testHistory = history.filter((item) => filenames.includes(item.filename));

    assert(testHistory.length === 2, "Import history was not isolated by organization.");
    assert(testHistory[0].filename === filenames[1], "Import history is not newest first.");
    assert(
      testHistory[1].totalRows === 100 &&
        testHistory[1].insertedRows === 20 &&
        testHistory[1].updatedRows === 75 &&
        testHistory[1].errorRows === 5,
      "Import counters do not match the processed result.",
    );
  } finally {
    await prisma.importRecord.deleteMany({
      where: { filename: { in: filenames } },
    });
  }

  console.log("Import history counters, ordering, and isolation passed.");
}

testImportHistory()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
