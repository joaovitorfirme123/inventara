import { getPriorityRuleSettings, savePriorityRule } from "@/data/priority-rules";
import { parsePriorityRuleConfig } from "@/lib/inventory-priority";
import { getSessionContext } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSessionContext(request.headers);
  if (!session?.user.organizationId) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  return Response.json({ settings: await getPriorityRuleSettings(session.user.organizationId) });
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext(request.headers);
    if (!session?.user.organizationId) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    if (session.user.role !== "OWNER") return Response.json({ error: "Permissão insuficiente." }, { status: 403 });

    const body = await request.json() as { name?: unknown; configuration?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const configuration = parsePriorityRuleConfig(body.configuration);
    if (!name || !configuration) return Response.json({ error: "Nome ou configuração inválidos." }, { status: 400 });

    const result = await savePriorityRule({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      name,
      configuration,
    });
    return Response.json(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "INVALID_PRIORITY_RULE") {
      return Response.json({ error: "Nome ou configuração inválidos." }, { status: 400 });
    }
    console.error("Priority rule save failed", error);
    return Response.json({ error: "Não foi possível salvar a regra." }, { status: 500 });
  }
}
