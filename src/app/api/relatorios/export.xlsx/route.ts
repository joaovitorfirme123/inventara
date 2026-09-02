import { listProductsForExport } from "@/data/products";
import { getProductExportFilters, describeReportFilters } from "@/lib/report-filters";
import { getSessionContext } from "@/lib/session";
import { createXlsx } from "@/lib/xlsx";

export const runtime = "nodejs";

function formatDate(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(value)
    : "";
}

export async function GET(request: Request) {
  try {
    const session = await getSessionContext(request.headers);
    if (!session || !session.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }

    const filters = getProductExportFilters(new URL(request.url), session.user.organizationId);
    const products = await listProductsForExport(filters);
    const rows = [
      ["Código PLU", "Código de barras", "Descrição", "Seção", "Grupo", "Subgrupo", "Último inventário", "Estoque atual"],
      ...products.map((product) => [
        product.plu,
        product.barcode ?? "",
        product.description,
        product.section ?? "Sem seção",
        product.group ?? "Sem grupo",
        product.subgroup ?? "Sem subgrupo",
        formatDate(product.lastInventory),
        product.currentStock.toString(),
      ]),
    ];
    const body = createXlsx([
      { name: "Produtos", rows },
      {
        name: "Filtros",
        rows: [["Filtro"], ...describeReportFilters(filters).map((filter) => [filter])],
      },
    ]);
    const date = new Date().toISOString().slice(0, 10);

    return new Response(body as unknown as BodyInit, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="relatorio-produtos-${date}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: unknown) {
    console.error("XLSX report export failed", error);
    return Response.json({ error: "Não foi possível gerar o relatório Excel." }, { status: 500 });
  }
}
