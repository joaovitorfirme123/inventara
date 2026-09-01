import { deleteInventoryPlan, updateInventoryPlan } from "@/data/inventory-plans";
import { isInventoryPlanStatus } from "@/lib/inventory-plan";
import { getSessionContext } from "@/lib/session";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function errorResponse(error: unknown, fallback: string) {
  const messages: Record<string, string> = {
    INVALID_DATE: "Informe uma data prevista válida.",
    INVALID_TRANSITION: "Essa transição de status não é permitida.",
    PLAN_NOT_FOUND: "Planejamento não encontrado nesta organização.",
  };
  const message = error instanceof Error ? messages[error.message] : undefined;
  const status = error instanceof Error && error.message === "PLAN_NOT_FOUND" ? 404 : message ? 400 : 500;
  return Response.json({ error: message ?? fallback }, { status });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const session = await getSessionContext(request.headers);
    if (!session?.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }

    const { planId } = await params;
    if (!uuidPattern.test(planId)) {
      return Response.json({ error: "Planejamento não encontrado." }, { status: 404 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const status = text(body.status);
    if (!isInventoryPlanStatus(status)) {
      return Response.json({ error: "Status de planejamento inválido." }, { status: 400 });
    }

    await updateInventoryPlan({
      organizationId: session.user.organizationId,
      planId,
      plannedDate: text(body.plannedDate) || null,
      responsibleName: text(body.responsibleName) || null,
      status,
    });

    return Response.json({ ok: true });
  } catch (error: unknown) {
    console.error("Failed to update inventory plan", error);
    return errorResponse(error, "Não foi possível atualizar o planejamento.");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const session = await getSessionContext(request.headers);
    if (!session?.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }

    const { planId } = await params;
    if (!uuidPattern.test(planId)) {
      return Response.json({ error: "Planejamento não encontrado." }, { status: 404 });
    }

    await deleteInventoryPlan(session.user.organizationId, planId);
    return Response.json({ ok: true });
  } catch (error: unknown) {
    console.error("Failed to delete inventory plan", error);
    return errorResponse(error, "Não foi possível apagar o planejamento.");
  }
}
