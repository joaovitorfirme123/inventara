import { getQuickProductDetailsByPlu } from "@/data/stock-history";
import { getSessionContext } from "@/lib/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ plu: string }> },
) {
  const session = await getSessionContext(request.headers);

  if (!session || !session.user.organizationId) {
    return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  }

  const { plu } = await params;
  const product = await getQuickProductDetailsByPlu(
    session.user.organizationId,
    plu,
  );

  if (!product) {
    return Response.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  return Response.json(product, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
