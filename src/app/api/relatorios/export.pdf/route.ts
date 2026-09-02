import { listProductsForExport } from "@/data/products";
import { getProductExportFilters } from "@/lib/report-filters";
import { createProductsPdf } from "@/lib/pdf-report";
import { getSessionContext } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await getSessionContext(request.headers);
    if (!session || !session.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }

    const filters = getProductExportFilters(new URL(request.url), session.user.organizationId);
    const products = await listProductsForExport(filters);
    const body = await createProductsPdf(products, filters);
    const date = new Date().toISOString().slice(0, 10);

    return new Response(body as unknown as BodyInit, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="relatorio-produtos-${date}.pdf"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error: unknown) {
    console.error("PDF report export failed", error);
    return Response.json({ error: "Não foi possível gerar o relatório PDF." }, { status: 500 });
  }
}
