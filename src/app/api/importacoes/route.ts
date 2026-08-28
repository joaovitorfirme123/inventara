import { importProducts } from "@/data/import-products";
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
    const result = await importProducts({
      organizationId,
      filename: file.name,
      rows: parsed.rows,
      errorRows: parsed.errors.length,
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
