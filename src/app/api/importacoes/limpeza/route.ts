import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session";

// Limpeza de historico antigo da aba Importacoes.
// Pisos de seguranca:
// 1) NUNCA remove os 2 snapshots mais recentes de cada produto (preserva
//    "atual", "anterior" e "variacao" da tela Estoque para todos os produtos,
//    inclusive os ausentes das importacoes recentes).
// 2) NUNCA remove o detalhe linha a linha da importacao mais recente: o corte
//    de auditoria e limitado a data da ultima importacao e ela e excluida do
//    filtro pelo proprio id.
// 3) A exclusao so roda com o token da previa exibida: se uma nova importacao
//    (ou outra limpeza) mudar os dados entre a previa e a confirmacao, o POST
//    responde 409 e nao apaga nada. A transacao SERIALIZABLE garante que uma
//    importacao concorrente durante a execucao tambem aborta a limpeza.

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

const SNAPSHOT_PREVIEW_SQL = `
  WITH ranked AS (
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
  FROM ranked
`;

const AUDIT_FILTER_SQL = `
  FROM import_rows ir
  JOIN imports i ON i.id = ir.import_id
  WHERE i.organization_id = $1::uuid
    AND i.imported_at < $2::timestamptz
    AND i.id <> $3::uuid
`;

const NO_IMPORT_ID = "00000000-0000-0000-0000-000000000000";

type CleanupScope = {
  trimSnapshots: boolean;
  auditBefore?: string | null; // ISO date: apaga linhas de auditoria de importacoes anteriores a esta data (limitado a ultima importacao)
};

type LatestImport = { id: string; imported_at: Date } | null;

type Db = typeof prisma | Prisma.TransactionClient;

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

async function loadLatestImport(db: Db, organizationId: string): Promise<LatestImport> {
  const rows = await db.$queryRawUnsafe<{ id: string; imported_at: Date }[]>(
    `SELECT id, imported_at FROM imports
     WHERE organization_id = $1::uuid
     ORDER BY imported_at DESC, id DESC
     LIMIT 1`,
    organizationId,
  );
  return rows[0] ?? null;
}

// O token resume o estado das tabelas envolvidas. Qualquer importacao nova ou
// limpeza concorrente muda pelo menos um destes numeros, invalidando a previa.
async function loadToken(db: Db, organizationId: string): Promise<string> {
  const [row] = await db.$queryRawUnsafe<{ token: string }[]>(
    `SELECT md5(concat_ws('|',
       (SELECT count(*) FROM imports WHERE organization_id = $1::uuid),
       (SELECT count(*) FROM stock_history WHERE organization_id = $1::uuid),
       (SELECT count(*) FROM import_rows ir JOIN imports i ON i.id = ir.import_id WHERE i.organization_id = $1::uuid),
       (SELECT coalesce(max(id)::text, 'none') FROM stock_history WHERE organization_id = $1::uuid),
       (SELECT coalesce(max(id)::text, 'none') FROM imports WHERE organization_id = $1::uuid)
     )) AS token`,
    organizationId,
  );
  return row.token;
}

function effectiveCutoff(requested: Date | null, latest: LatestImport): Date | null {
  if (!requested) return null;
  if (latest && requested.getTime() > latest.imported_at.getTime()) {
    return latest.imported_at;
  }
  return requested;
}

export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if ("error" in auth) return auth.error;
  const organizationId = auth.organizationId;

  const url = new URL(request.url);
  const auditBeforeParam = url.searchParams.get("auditBefore");
  const requested = auditBeforeParam ? new Date(auditBeforeParam) : null;
  if (auditBeforeParam && Number.isNaN(requested?.getTime())) {
    return NextResponse.json({ error: "Data de corte inválida." }, { status: 400 });
  }

  const latest = await loadLatestImport(prisma, organizationId);
  const cutoff = effectiveCutoff(requested, latest);

  const [snapshotPreview] = await prisma.$queryRawUnsafe<
    { apagaveis: bigint; mantidas: bigint; tamanho_total: string }[]
  >(SNAPSHOT_PREVIEW_SQL, organizationId);

  let auditPreview;
  if (cutoff) {
    [auditPreview] = await prisma.$queryRawUnsafe<
      { apagaveis: bigint; importacoes_afetadas: bigint; tamanho_total: string }[]
    >(
      `SELECT
         count(*) AS apagaveis,
         count(DISTINCT ir.import_id) AS importacoes_afetadas,
         pg_size_pretty(pg_total_relation_size('import_rows')) AS tamanho_total
       ${AUDIT_FILTER_SQL}`,
      organizationId,
      cutoff,
      latest?.id ?? NO_IMPORT_ID,
    );
  }

  const token = await loadToken(prisma, organizationId);

  return NextResponse.json({
    snapshots: {
      apagaveis: Number(snapshotPreview.apagaveis),
      mantidas: Number(snapshotPreview.mantidas),
      tamanhoAtualTabela: snapshotPreview.tamanho_total,
      garantia: "Os 2 registros mais recentes de cada produto são sempre preservados.",
    },
    auditoria: cutoff
      ? {
          corteSolicitado: requested ? requested.toISOString() : null,
          corte: cutoff.toISOString(),
          apagaveis: Number(auditPreview!.apagaveis),
          importacoesAfetadas: Number(auditPreview!.importacoes_afetadas),
          tamanhoAtualTabela: auditPreview!.tamanho_total,
        }
      : null,
    ultimaImportacao: latest ? { data: latest.imported_at.toISOString() } : null,
    token,
  });
}

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if ("error" in auth) return auth.error;
  const organizationId = auth.organizationId;

  let body: { confirm?: boolean; previewToken?: string; scope?: CleanupScope };
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
  if (!body.previewToken) {
    return NextResponse.json(
      { error: "Prévia obrigatória: carregue a revisão (GET) antes de confirmar." },
      { status: 400 },
    );
  }

  const scope = body.scope ?? { trimSnapshots: false };
  const requested = scope.auditBefore ? new Date(scope.auditBefore) : null;
  if (scope.auditBefore && Number.isNaN(requested?.getTime())) {
    return NextResponse.json({ error: "Data de corte inválida." }, { status: 400 });
  }
  if (!scope.trimSnapshots && !requested) {
    return NextResponse.json({ error: "Nada para limpar: escolha ao menos uma opção." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const latest = await loadLatestImport(tx, organizationId);
        const cutoff = effectiveCutoff(requested, latest);
        const token = await loadToken(tx, organizationId);
        if (token !== body.previewToken) {
          return { stale: true as const, snapshotsRemovidos: 0, auditoriaRemovida: 0, corteEfetivo: null as string | null };
        }

        let snapshotsRemovidos = 0;
        let auditoriaRemovida = 0;

        if (scope.trimSnapshots) {
          snapshotsRemovidos = await tx.$executeRawUnsafe(SNAPSHOT_TRIM_SQL, organizationId);
        }

        if (cutoff) {
          auditoriaRemovida = await tx.$executeRawUnsafe(
            `DELETE FROM import_rows
             WHERE import_id IN (
               SELECT id FROM imports
               WHERE organization_id = $1::uuid
                 AND imported_at < $2::timestamptz
                 AND id <> $3::uuid
             )`,
            organizationId,
            cutoff,
            latest?.id ?? NO_IMPORT_ID,
          );
        }

        return {
          stale: false as const,
          snapshotsRemovidos,
          auditoriaRemovida,
          corteEfetivo: cutoff ? cutoff.toISOString() : null,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 120000,
      },
    );

    if (result.stale) {
      return NextResponse.json(
        {
          error:
            "Os dados mudaram desde a sua prévia (por exemplo, uma nova importação). Nada foi apagado; revise os números atualizados antes de confirmar de novo.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      snapshotsRemovidos: result.snapshotsRemovidos,
      auditoriaRemovida: result.auditoriaRemovida,
      corteEfetivo: result.corteEfetivo,
      aviso:
        "O espaço físico no banco é recuperado por uma manutenção (VACUUM FULL) agendada, não imediatamente após a exclusão.",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json(
        {
          error:
            "Os dados mudaram durante a limpeza (conflito com outra operação). Nada foi apagado; revise a prévia e tente de novo.",
        },
        { status: 409 },
      );
    }
    throw error;
  }
}
