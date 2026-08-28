import { prisma } from "@/lib/prisma";

type CreateImportRecordInput = {
  organizationId: string;
  filename: string;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  errorRows: number;
};

export function createImportRecord(input: CreateImportRecordInput) {
  return prisma.importRecord.create({
    data: input,
  });
}

export function listImportsByOrganization(organizationId: string) {
  return prisma.importRecord.findMany({
    where: { organizationId },
    orderBy: [{ importedAt: "desc" }, { id: "desc" }],
    take: 50,
  });
}
