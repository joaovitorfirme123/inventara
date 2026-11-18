import { discardSalesImport, getSalesImportSummary } from "@/data/vendas";
import { getSessionContext } from "@/lib/session";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionContext(request.headers);

    if (!session || !session.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }

    const { id } = await context.params;
    const summary = await getSalesImportSummary(session.user.organizationId, id);

    if (!summary) {
      return Response.json({ error: "Importação não encontrada." }, { status: 404 });
    }

    return Response.json(summary);
  } catch (error: unknown) {
    console.error("Sales import summary failed", error);
    return Response.json(
      { error: "Não foi possível ler a importação." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionContext(request.headers);

    if (!session || !session.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }

    const { id } = await context.params;
    const deleted = await discardSalesImport(session.user.organizationId, id);

    if (!deleted) {
      return Response.json(
        { error: "Importação não encontrada." },
        { status: 404 },
      );
    }

    return Response.json({ ok: true, filename: deleted.filename, status: deleted.status });
  } catch (error: unknown) {
    console.error("Sales import delete failed", error);
    return Response.json(
      { error: "Não foi possível excluir a importação." },
      { status: 500 },
    );
  }
}
