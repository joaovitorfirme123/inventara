import PDFDocument from "pdfkit";
import type { listProductsForExport } from "@/data/products";
import { describeReportFilters } from "@/lib/report-filters";

function formatDate(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(value)
    : "Sem data";
}

export async function createProductsPdf(
  products: Awaited<ReturnType<typeof listProductsForExport>>,
  filters: Parameters<typeof describeReportFilters>[0],
) {
  const document = new PDFDocument({ margin: 42, size: "A4" });
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve) => {
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
  });

  document.fontSize(19).fillColor("#173f32").text("Relatório de produtos");
  document.moveDown(0.35).fontSize(8).fillColor("#66665f").text(describeReportFilters(filters).join("  |  "));
  document.moveDown(1).fontSize(9).fillColor("#1d2924").text(`${products.length} produtos no recorte`);
  document.moveDown(0.8);

  for (const product of products) {
    if (document.y > 750) document.addPage();
    document.fontSize(9).fillColor("#173f32").text(`${product.plu}  ${product.description}`);
    document.fontSize(7.5).fillColor("#66665f").text(
      `${product.section ?? "Sem seção"} / ${product.group ?? "Sem grupo"} / ${product.subgroup ?? "Sem subgrupo"}  |  Estoque: ${product.currentStock.toString()}  |  Último inventário: ${formatDate(product.lastInventory)}`,
      { indent: 12 },
    );
    document.moveDown(0.45);
  }

  document.end();
  return finished;
}
