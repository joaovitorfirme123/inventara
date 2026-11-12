import {
  buildDivergenceRecord,
  createDivergenceAnalysis,
  LIMIT_MESSAGE,
  listDivergenceAnalyses,
  listDivergenceAnalysesFull,
  MAX_BODY_CHARS,
} from "@/data/divergence-analyses";
import { getSessionContext } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await getSessionContext(request.headers);
    if (!session?.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }
    const full = new URL(request.url).searchParams.get("full") === "1";
    const records = full
      ? await listDivergenceAnalysesFull(session.user.organizationId)
      : await listDivergenceAnalyses(session.user.organizationId);
    return Response.json({ records });
  } catch (error: unknown) {
    console.error("Failed to list divergence analyses", error);
    return Response.json({ error: "Não foi possível ler o histórico de análises agora." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext(request.headers);
    if (!session?.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }
    const text = await request.text();
    if (text.length > MAX_BODY_CHARS) {
      return Response.json({ error: "Esta análise é grande demais para salvar." }, { status: 413 });
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json({ error: "Pedido inválido." }, { status: 400 });
    }
    const record = buildDivergenceRecord(parsed);
    if ("error" in record) return Response.json({ error: record.error }, { status: 400 });

    const created = await createDivergenceAnalysis(session.user.organizationId, record);
    if (created === "LIMIT_REACHED") {
      return Response.json({ error: LIMIT_MESSAGE }, { status: 409 });
    }
    if ("duplicate" in created) {
      const dup = created.duplicate;
      const quando = dup.savedAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
      return Response.json(
        {
          error: `Este mesmo arquivo já está salvo no histórico como "${dup.name}"${dup.inventoryDate ? `, inventário de ${dup.inventoryDate},` : ""} salvo em ${quando}. Não gravei uma cópia repetida. Se este CSV é de uma contagem diferente, informe a data do inventário correspondente antes de salvar.`,
        },
        { status: 409 },
      );
    }
    return Response.json({ record: created }, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to save divergence analysis", error);
    return Response.json({ error: "Não foi possível salvar a análise agora. Ela continua neste navegador." }, { status: 500 });
  }
}
