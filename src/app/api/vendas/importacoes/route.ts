import { createHash } from "node:crypto";
import { PAYLOAD_TOO_LARGE_MESSAGE, stageSalesImport } from "@/data/vendas";
import {
  DUPLICATE_IMPORT_WINDOW_MS,
  hasAllowedImportExtension,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
} from "@/lib/import-limits";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";
import { parseSalesCsvBuffer } from "@/lib/vendas-csv";

export async function POST(request: Request) {
  try {
    const session = await getSessionContext(request.headers);

    if (!session || !session.user.organizationId) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Selecione um arquivo CSV." }, { status: 400 });
    }

    if (!hasAllowedImportExtension(file.name)) {
      return Response.json(
        { error: "Formato inválido. Envie um arquivo com extensão .csv." },
        { status: 400 },
      );
    }

    if (file.size > MAX_IMPORT_FILE_BYTES) {
      return Response.json(
        {
          error: `O arquivo excede o limite de ${Math.round(
            MAX_IMPORT_FILE_BYTES / (1024 * 1024),
          )} MB.`,
        },
        { status: 413 },
      );
    }

    const buffer = await file.arrayBuffer();
    const fileHash = createHash("sha256").update(new Uint8Array(buffer)).digest("hex");
    const organizationId = session.user.organizationId;

    const parsed = parseSalesCsvBuffer(buffer);

    if (parsed.fatalErrors.length > 0) {
      return Response.json(
        { error: parsed.fatalErrors.join(" ") },
        { status: 422 },
      );
    }

    if (parsed.totalRows > MAX_IMPORT_ROWS) {
      return Response.json(
        {
          error: `O arquivo possui ${parsed.totalRows.toLocaleString(
            "pt-BR",
          )} registros, acima do limite de ${MAX_IMPORT_ROWS.toLocaleString("pt-BR")}.`,
        },
        { status: 413 },
      );
    }

    const windowStart = new Date(Date.now() - DUPLICATE_IMPORT_WINDOW_MS);

    const pendingSameFile = await prisma.salesImport.findFirst({
      where: { organizationId, fileHash, status: "PENDING", importedAt: { gte: windowStart } },
      orderBy: { importedAt: "desc" },
      select: { id: true },
    });

    if (pendingSameFile) {
      return Response.json({ alreadyPendingId: pendingSameFile.id });
    }

    const appliedSameFile = await prisma.salesImport.findFirst({
      where: { organizationId, fileHash, status: "APPLIED", importedAt: { gte: windowStart } },
      orderBy: { importedAt: "desc" },
      select: { filename: true, importedAt: true },
    });

    if (appliedSameFile) {
      const importedAt = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(appliedSameFile.importedAt);

      return Response.json(
        {
          error: `Este mesmo arquivo já foi importado em ${importedAt} como "${appliedSameFile.filename}". Se você tem uma versão mais nova do período, envie o arquivo atualizado.`,
        },
        { status: 409 },
      );
    }

    const staged = await stageSalesImport({
      organizationId,
      filename: file.name,
      fileHash,
      rows: parsed.rows,
      errorRows: parsed.errors.length,
    });

    if (staged === "PAYLOAD_TOO_LARGE") {
      return Response.json({ error: PAYLOAD_TOO_LARGE_MESSAGE }, { status: 413 });
    }

    return Response.json({
      ...staged,
      errors: parsed.errors.slice(0, 20),
    });
  } catch (error: unknown) {
    console.error("Sales CSV staging failed", error);
    return Response.json(
      { error: "Não foi possível processar o arquivo." },
      { status: 500 },
    );
  }
}
