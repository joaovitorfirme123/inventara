import { getInventoryRows } from "@/data/inventories";
import { askInventoryAssistant } from "@/lib/inventory-assistant";
import { getSessionContext } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const session = await getSessionContext(request.headers);
    if (!session?.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }

    const body = (await request.json()) as { question?: unknown };
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) {
      return Response.json({ error: "Escreva uma pergunta para o assistente." }, { status: 400 });
    }
    if (question.length > 1200) {
      return Response.json({ error: "A pergunta deve ter no máximo 1.200 caracteres." }, { status: 400 });
    }

    const rows = await getInventoryRows(session.user.organizationId);
    const answer = await askInventoryAssistant(question, rows);
    return Response.json({ answer });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "ASSISTANT_NOT_CONFIGURED") {
      return Response.json(
        { error: "O assistente ainda não foi configurado neste ambiente." },
        { status: 503 },
      );
    }
    if (error instanceof Error && error.message === "ASSISTANT_EMPTY_RESPONSE") {
      return Response.json(
        { error: "O assistente não retornou uma resposta. Tente novamente." },
        { status: 502 },
      );
    }
    console.error("Inventory assistant request failed", error);
    return Response.json(
      { error: "Não foi possível consultar o assistente agora." },
      { status: 502 },
    );
  }
}
