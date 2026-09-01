import {
  createInventoryPlan,
  type InventoryPlanTarget,
} from "@/data/inventory-plans";
import { getSessionContext } from "@/lib/session";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function errorResponse(error: unknown) {
  const messages: Record<string, string> = {
    INVALID_DATE: "Informe uma data prevista válida.",
    INVALID_RESPONSIBLE: "O responsável selecionado não está disponível nesta organização.",
    INVALID_TARGET: "Selecione um grupo e subgrupo existentes no ranking de inventários.",
  };
  const message = error instanceof Error ? messages[error.message] : undefined;
  return Response.json(
    { error: message ?? "Não foi possível criar o planejamento." },
    { status: message ? 400 : 500 },
  );
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext(request.headers);
    if (!session?.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const target: InventoryPlanTarget = {
      section: text(body.section),
      group: text(body.group),
      subgroup: text(body.subgroup),
    };
    if (!target.section || !target.group || !target.subgroup) {
      return Response.json({ error: "Selecione um grupo e subgrupo." }, { status: 400 });
    }

    const plan = await createInventoryPlan({
      organizationId: session.user.organizationId,
      target,
      plannedDate: text(body.plannedDate) || null,
      responsibleId: text(body.responsibleId) || null,
    });

    return Response.json({ id: plan.id }, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create inventory plan", error);
    return errorResponse(error);
  }
}
