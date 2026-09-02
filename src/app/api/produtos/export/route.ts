import { listProductsForExport } from "@/data/products";
import { serializeProductsToCsv } from "@/lib/csv";
import { getProductExportFilters } from "@/lib/report-filters";
import { getSessionContext } from "@/lib/session";

function formatDate(value: Date | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export async function GET(request: Request) {
  try {
    const session = await getSessionContext(request.headers);

    if (!session || !session.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }

    const products = await listProductsForExport(
      getProductExportFilters(new URL(request.url), session.user.organizationId),
    );
    const csv = serializeProductsToCsv(products.map((product) => ({
      ...product,
      lastInventory: formatDate(product.lastInventory),
      currentStock: product.currentStock.toString(),
    })));
    const date = new Date().toISOString().slice(0, 10);

    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="produtos-atual-${date}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error: unknown) {
    console.error("Current products export failed", error);
    return Response.json(
      { error: "Não foi possível gerar o arquivo CSV." },
      { status: 500 },
    );
  }
}
