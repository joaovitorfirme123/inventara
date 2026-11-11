import { removeDivergenceAnalysis } from "@/data/divergence-analyses";
import { getSessionContext } from "@/lib/session";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ analysisId: string }> },
) {
  try {
    const session = await getSessionContext(request.headers);
    if (!session?.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }
    const { analysisId } = await params;
    if (!analysisId || analysisId.length > 80) {
      return Response.json({ error: "Análise não encontrada." }, { status: 404 });
    }
    const removed = await removeDivergenceAnalysis(session.user.organizationId, analysisId);
    if (!removed) {
      return Response.json({ error: "Análise não encontrada nesta organização." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error: unknown) {
    console.error("Failed to remove divergence analysis", error);
    return Response.json({ error: "Não foi possível remover a análise agora." }, { status: 500 });
  }
}
