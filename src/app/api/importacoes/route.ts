import { importProducts } from "@/data/import-products";
import { createImportRecord } from "@/data/imports";
import { parseCsvBuffer } from "@/lib/csv";
import { getCurrentOrganizationId } from "@/lib/current-organization";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "Selecione um arquivo CSV." }, { status: 400 });
    }

    const parsed = parseCsvBuffer(await file.arrayBuffer());

    if (parsed.fatalErrors.length > 0) {
      return Response.json(
        { error: parsed.fatalErrors.join(" ") },
        { status: 422 },
      );
    }

    const organizationId = getCurrentOrganizationId();
    const result = await importProducts(
      organizationId,
      parsed.rows,
      parsed.errors.length,
    );
    await createImportRecord({
      organizationId,
      filename: file.name,
      totalRows: result.processedRows,
      insertedRows: result.insertedRows,
      updatedRows: result.updatedRows,
      errorRows: result.errorRows,
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
