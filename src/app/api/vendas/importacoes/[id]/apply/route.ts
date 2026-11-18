import { applySalesImport } from "@/data/vendas";
import { getSessionContext } from "@/lib/session";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSessionContext(request.headers);

    if (!session || !session.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }

    const { id } = await context.params;

    let mode: string;
    try {
      const body = (await request.json()) as { mode?: string };
      mode = body.mode ?? "";
    } catch {
      return Response.json({ error: "Pedido inválido." }, { status: 400 });
    }

    if (mode !== "ADD" && mode !== "REPLACE") {
      return Response.json({ error: "Modo de gravação inválido." }, { status: 400 });
    }

    const result = await applySalesImport(session.user.organizationId, id, mode);

    if (result === "NOT_FOUND") {
      return Response.json({ error: "Importação não encontrada." }, { status: 404 });
    }
    if (result === "NOT_PENDING") {
      return Response.json(
        { error: "Esta importação já foi processada. Recarregue a página." },
        { status: 409 },
      );
    }
    if (result === "NO_PAYLOAD") {
      return Response.json(
        { error: "O conteúdo desta revisão expirou. Envie o arquivo novamente." },
        { status: 410 },
      );
    }

    return Response.json(result);
  } catch (error: unknown) {
    console.error("Sales import apply failed", error);
    return Response.json(
      { error: "Não foi possível gravar as vendas." },
      { status: 500 },
    );
  }
}
