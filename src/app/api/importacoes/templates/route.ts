import {
  listImportTemplates,
  parseImportTemplateConfiguration,
  saveImportTemplate,
} from "@/data/import-templates";
import { getSessionContext } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await getSessionContext(request.headers);
    if (!session?.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }
    const templates = await listImportTemplates(session.user.organizationId);
    return Response.json({ templates });
  } catch {
    return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionContext(request.headers);
    if (!session?.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }
    if (session.user.role !== "OWNER") {
      return Response.json({ error: "Somente proprietários podem gerenciar templates." }, { status: 403 });
    }

    const body = await request.json() as {
      templateId?: unknown;
      name?: unknown;
      configuration?: unknown;
    };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const configuration = parseImportTemplateConfiguration(body.configuration);
    if (!name || name.length > 80 || !configuration) {
      return Response.json({ error: "Nome ou configuração de template inválidos." }, { status: 400 });
    }

    const result = await saveImportTemplate({
      organizationId: session.user.organizationId,
      actorId: session.user.id,
      templateId: typeof body.templateId === "string" ? body.templateId : undefined,
      name,
      configuration,
    });
    return Response.json(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "TEMPLATE_NOT_FOUND") {
      return Response.json({ error: "Template não encontrado." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "INVALID_TEMPLATE") {
      return Response.json({ error: "Configuração de template inválida." }, { status: 400 });
    }
    console.error("Import template failed", error);
    return Response.json({ error: "Não foi possível salvar o template." }, { status: 500 });
  }
}
