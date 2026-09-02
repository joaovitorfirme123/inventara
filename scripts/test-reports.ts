import "dotenv/config";
import { randomUUID } from "node:crypto";
import { unzipSync, strFromU8 } from "fflate";
import { importProducts } from "../src/data/import-products";
import { clearOrganizationData } from "../src/data/organization-data";
import { listProductsForExport } from "../src/data/products";
import { getCoverageComparison } from "../src/data/reporting";
import { getProductExportFilters } from "../src/lib/report-filters";
import { createProductsPdf } from "../src/lib/pdf-report";
import { createXlsx } from "../src/lib/xlsx";
import type { CsvProduct } from "../src/lib/csv";
import { prisma } from "../src/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function row(plu: string, section: string, lastInventory: string | null): CsvProduct {
  return {
    plu,
    barcode: null,
    description: `Produto ${plu}`,
    section,
    group: "Grupo",
    subgroup: "Subgrupo",
    lastInventory,
    currentStock: "10",
  };
}

async function testReports() {
  const organizationId = randomUUID();
  const year = new Date().getFullYear();

  try {
    await prisma.organization.create({ data: { id: organizationId, name: "Relatórios" } });
    await importProducts({
      organizationId,
      filename: "reports-test.csv",
      fileHash: `reports-test-${organizationId}`,
      rows: [row("REPORT-A", "Mercearia", `${year}-08-28`), row("REPORT-B", "Frios", null)],
      errorRows: 0,
    });

    const filters = getProductExportFilters(new URL(`https://inventara.test/?section=Mercearia&status=contado&year=${year}`), organizationId);
    const products = await listProductsForExport(filters);
    assert(products.length === 1 && products[0].plu === "REPORT-A", "Report filters returned an incorrect recorte.");
    const comparison = await getCoverageComparison(organizationId, year, year - 1);
    assert(comparison.current.coveragePercentage === 50, "Current period comparison is incorrect.");
    assert(comparison.previous.coveragePercentage === null, "Empty comparison period should remain empty.");

    const workbook = createXlsx([{ name: "Produtos", rows: [["PLU", "Descrição"], ["REPORT-A", "Produto REPORT-A"]] }]);
    const files = unzipSync(workbook);
    assert(files["xl/worksheets/sheet1.xml"] !== undefined, "Excel worksheet was not generated.");
    assert(strFromU8(files["xl/worksheets/sheet1.xml"]).includes("REPORT-A"), "Excel worksheet content is incorrect.");

    const pdf = await createProductsPdf(products, filters);
    assert(pdf.subarray(0, 4).toString() === "%PDF", "PDF report was not generated.");
  } finally {
    await clearOrganizationData(organizationId);
    await prisma.organization.delete({ where: { id: organizationId } });
  }

  console.log("Report filters, Excel generation, PDF generation, and cleanup passed.");
}

testReports()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
