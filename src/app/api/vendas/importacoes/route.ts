import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { PAYLOAD_TOO_LARGE_MESSAGE, stageSalesImport } from "@/data/vendas";
import {
  DUPLICATE_IMPORT_WINDOW_MS,
  hasAllowedImportExtension,
  MAX_IMPORT_COMPRESSED_BYTES,
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

    // O navegador envia o CSV compactado (gzip) para caber no limite de 4,5 MB da hospedagem.
    const originalName = file.name.toLowerCase().endsWith(".gz")
      ? file.name.slice(0, -3)
      : file.name;

    const uploadBytes = new Uint8Array(await file.arrayBuffer());

    let csvBytes: Uint8Array;
    if (uploadBytes.length >= 2 && uploadBytes[0] === 0x1f && uploadBytes[1] === 0x8b) {
      if (uploadBytes.byteLength > MAX_IMPORT_COMPRESSED_BYTES) {
        return Response.json(
          {
            error:
              "Mesmo compactado, o arquivo ficou grande demais para o envio. Divida o período em arquivos menores.",
          },
          { status: 413 },
        );
      }
      try {
        csvBytes = gunzipSync(uploadBytes, {
          // Trava de segurança: interrompe a descompressão se o conteúdo passar do limite.
          maxOutputLength: MAX_IMPORT_FILE_BYTES + 1,
        });
      } catch {
        return Response.json(
          {
            error: `O arquivo excede o limite de ${Math.round(
              MAX_IMPORT_FILE_BYTES / (1024 * 1024),
            )} MB ou está corrompido. Tente exportar um período menor.`,
          },
          { status: 413 },
        );
      }
    } else {
      if (uploadBytes.byteLength > MAX_IMPORT_FILE_BYTES) {
        return Response.json(
          {
            error: `O arquivo excede o limite de ${Math.round(
              MAX_IMPORT_FILE_BYTES / (1024 * 1024),
            )} MB.`,
          },
          { status: 413 },
        );
      }
      csvBytes = uploadBytes;
    }

    // Hash sobre o conteúdo CSV real: o mesmo arquivo é reconhecido compactado ou não.
    const fileHash = createHash("sha256").update(csvBytes).digest("hex");
    const organizationId = session.user.organizationId;

    const csvBuffer = csvBytes.buffer.slice(
      csvBytes.byteOffset,
      csvBytes.byteOffset + csvBytes.byteLength,
    ) as ArrayBuffer;
    const parsed = parseSalesCsvBuffer(csvBuffer);

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
      filename: originalName,
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
