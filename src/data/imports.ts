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

export function getImportDetails(organizationId: string, importId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(importId)) {
    return Promise.resolve(null);
  }

  return prisma.importRecord.findFirst({
    where: { id: importId, organizationId },
    include: {
      rows: {
        orderBy: { rowNumber: "asc" },
        select: {
          id: true,
          rowNumber: true,
          status: true,
          plu: true,
          description: true,
          field: true,
          message: true,
          productId: true,
        },
      },
    },
  });
}
