import { createHash } from "node:crypto";
import { importProducts } from "@/data/import-products";
import { parseCsvBuffer } from "@/lib/csv";
import {
  DUPLICATE_IMPORT_WINDOW_MS,
  hasAllowedImportExtension,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
} from "@/lib/import-limits";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";

function fileTooLargeError() {
  return Response.json(
    {
      error: `O arquivo excede o limite de ${Math.round(
        MAX_IMPORT_FILE_BYTES / (1024 * 1024),
      )} MB.`,
    },
    { status: 413 },
  );
}

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
      return fileTooLargeError();
    }

    const buffer = await file.arrayBuffer();
    const fileHash = createHash("sha256").update(new Uint8Array(buffer)).digest("hex");
    const parsed = parseCsvBuffer(buffer);

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
          )} registros, acima do limite de ${MAX_IMPORT_ROWS.toLocaleString(
            "pt-BR",
          )}.`,
        },
        { status: 413 },
      );
    }

    const organizationId = session.user.organizationId;
    const duplicate = await prisma.importRecord.findFirst({
      where: {
        organizationId,
        fileHash,
        importedAt: { gte: new Date(Date.now() - DUPLICATE_IMPORT_WINDOW_MS) },
      },
      orderBy: { importedAt: "desc" },
      select: { filename: true, importedAt: true },
    });

    if (duplicate) {
      const importedAt = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(duplicate.importedAt);

      return Response.json(
        {
          error: `Este arquivo já foi importado em ${importedAt} como "${
            duplicate.filename
          }". Reenvie somente se for uma atualização intencional.`,
        },
        { status: 409 },
      );
    }

    const result = await importProducts({
      organizationId,
      filename: file.name,
      fileHash,
      rows: parsed.rows,
      errorRows: parsed.errors.length,
      errors: parsed.errors,
    });

    return Response.json({
      ...result,
      errors: parsed.errors.slice(0, 20),
    });
  } catch (error: unknown) {
    console.error("CSV import failed", error);
    return Response.json(
      { error: "Não foi possível processar o arquivo." },
      { status: 500 },
    );
  }
}
