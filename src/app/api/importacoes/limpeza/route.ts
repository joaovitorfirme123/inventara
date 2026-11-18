import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";

// Limpeza de historico antigo da aba Importacoes.
// Piso de seguranca: NUNCA remove os 2 snapshots mais recentes de cada produto
// (preserva "atual", "anterior" e "variacao" da tela Estoque para todos os
// produtos, inclusive os ausentes das importacoes recentes).

const SNAPSHOT_TRIM_SQL = `
  DELETE FROM stock_history
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY product_id ORDER BY recorded_at DESC, id DESC
      ) AS rn
      FROM stock_history
      WHERE organization_id = $1::uuid
    ) ranked
    WHERE rn >= 3
  )
`;

type CleanupScope = {
  trimSnapshots: boolean;
  auditBefore?: string | null; // ISO date: apaga linhas de auditoria de importacoes anteriores a esta data
};

async function requireOwner(request: Request) {
  const session = await getSessionContext(request.headers);
  if (!session || !session.user.organizationId) {
    return { error: NextResponse.json({ error: "Autenticação necessária." }, { status: 401 }) };
  }
  if (session.user.role !== "OWNER") {
    return { error: NextResponse.json({ error: "Apenas o proprietário pode limpar o histórico." }, { status: 403 }) };
  }
  return { organizationId: session.user.organizationId };
}

export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if ("error" in auth) return auth.error;
  const organizationId = auth.organizationId;

  const url = new URL(request.url);
  const auditBeforeParam = url.searchParams.get("auditBefore");
  const auditBefore = auditBeforeParam ? new Date(auditBeforeParam) : null;
  if (auditBeforeParam && Number.isNaN(auditBefore?.getTime())) {
    return NextResponse.json({ error: "Data de corte inválida." }, { status: 400 });
  }

  const [snapshotPreview] = await prisma.$queryRawUnsafe<
    { apagaveis: bigint; mantidas: bigint; tamanho_total: string }[]
  >(
    `WITH ranked AS (
       SELECT id, ROW_NUMBER() OVER (
         PARTITION BY product_id ORDER BY recorded_at DESC, id DESC
       ) AS rn
       FROM stock_history
       WHERE organization_id = $1::uuid
     )
     SELECT
       count(*) FILTER (WHERE rn >= 3) AS apagaveis,
       count(*) FILTER (WHERE rn <= 2) AS mantidas,
       pg_size_pretty(pg_total_relation_size('stock_history')) AS tamanho_total
     FROM ranked`,
    organizationId,
  );

  let auditPreview;
  if (auditBefore) {
    [auditPreview] = await prisma.$queryRawUnsafe<
      { apagaveis: bigint; importacoes_afetadas: bigint; tamanho_total: string }[]
    >(
      `SELECT
         count(*) AS apagaveis,
         count(DISTINCT ir.import_id) AS importacoes_afetadas,
         pg_size_pretty(pg_total_relation_size('import_rows')) AS tamanho_total
       FROM import_rows ir
       JOIN imports i ON i.id = ir.import_id
       WHERE i.organization_id = $1::uuid AND i.imported_at < $2::timestamptz`,
      organizationId,
      auditBefore,
    );
  }

  return NextResponse.json({
    snapshots: {
      apagaveis: Number(snapshotPreview.apagaveis),
      mantidas: Number(snapshotPreview.mantidas),
      tamanhoAtualTabela: snapshotPreview.tamanho_total,
      garantia: "Os 2 registros mais recentes de cada produto são sempre preservados.",
    },
    auditoria: auditBefore
      ? {
          corte: auditBefore.toISOString(),
          apagaveis: Number(auditPreview!.apagaveis),
          importacoesAfetadas: Number(auditPreview!.importacoes_afetadas),
          tamanhoAtualTabela: auditPreview!.tamanho_total,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if ("error" in auth) return auth.error;
  const organizationId = auth.organizationId;

  let body: { confirm?: boolean; scope?: CleanupScope };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  if (body.confirm !== true) {
    return NextResponse.json(
      { error: "Confirmação obrigatória. Use GET para pré-visualizar antes." },
      { status: 400 },
    );
  }

  const scope = body.scope ?? { trimSnapshots: false };
  const auditBefore = scope.auditBefore ? new Date(scope.auditBefore) : null;
  if (scope.auditBefore && Number.isNaN(auditBefore?.getTime())) {
    return NextResponse.json({ error: "Data de corte inválida." }, { status: 400 });
  }
  if (!scope.trimSnapshots && !auditBefore) {
    return NextResponse.json({ error: "Nada para limpar: escolha ao menos uma opção." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    let snapshotsRemovidos = 0;
    let auditoriaRemovida = 0;

    if (scope.trimSnapshots) {
      snapshotsRemovidos = await tx.$executeRawUnsafe(SNAPSHOT_TRIM_SQL, organizationId);
    }

    if (auditBefore) {
      auditoriaRemovida = await tx.$executeRawUnsafe(
        `DELETE FROM import_rows
         WHERE import_id IN (
           SELECT id FROM imports
           WHERE organization_id = $1::uuid AND imported_at < $2::timestamptz
         )`,
        organizationId,
        auditBefore,
      );
    }

    return { snapshotsRemovidos, auditoriaRemovida };
  });

  return NextResponse.json({
    ...result,
    aviso:
      "O espaço físico no banco é recuperado por uma manutenção (VACUUM FULL) agendada, não imediatamente após a exclusão.",
  });
}
