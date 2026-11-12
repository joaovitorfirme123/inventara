/**
 * Teste de integração ISOLADO dos refinamentos de divergências.
 * Roda contra uma branch Neon descartável (schema-only), NUNCA contra produção.
 * Exige RUN_ISOLATED_TESTS=1 e que o banco esteja sem nenhuma organização
 * (prova de que não é o banco real, que tem organizações).
 *
 * Uso: RUN_ISOLATED_TESTS=1 DATABASE_URL=<branch> npx tsx scripts/test-divergencias-integracao.ts
 */
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { buildDivergenceRecord, createDivergenceAnalysis } from "../src/data/divergence-analyses";
import { SAMPLE_ITEMS } from "../src/lib/divergencias-amostra";
import type { Dataset, Item } from "../src/lib/divergencias";

async function main() {
if (process.env.RUN_ISOLATED_TESTS !== "1") {
  throw new Error("Defina RUN_ISOLATED_TESTS=1. Este teste grava no banco apontado por DATABASE_URL.");
}
const orgCount = await prisma.organization.count();
if (orgCount !== 0) {
  throw new Error(`Banco não é o isolado: ${orgCount} organizações encontradas. Abortando sem escrever nada.`);
}

function item(cod: string, cong: number, inv: number, div: number, atual: number): Item {
  return { cod, desc: `PRODUTO TESTE ${cod}`, cong, inv, div, atual };
}
const dataset: Dataset = {
  name: "csv-teste-isolado",
  items: [item("1", 10, 12, 2, 12), item("2", 5, 4, -1, 4), item("3", 8, 8, 0, 8)],
  warnings: [],
};

const org = await prisma.organization.create({ data: { name: "ORG TESTE ISOLADA REFINOS (descartável)" } });
const orgId = org.id;

function build(name: string, inventoryDate: string, ds: Dataset = dataset) {
  const rec = buildDivergenceRecord({ name, inventoryDate, dataset: ds });
  assert.ok(!("error" in rec), `buildDivergenceRecord não deveria falhar: ${"error" in rec ? rec.error : ""}`);
  return rec;
}

try {
  // 1. Validações de entrada (sem gravar)
  const amostra = buildDivergenceRecord({ name: "amostra", inventoryDate: "", dataset: { name: "amostra", items: SAMPLE_ITEMS, warnings: [] } });
  assert.ok("error" in amostra, "amostra de demonstração deve ser recusada");
  const dataInvalida = buildDivergenceRecord({ name: "x", inventoryDate: "31/02/2026", dataset });
  assert.ok("error" in dataInvalida && dataInvalida.error.includes("DD/MM/AAAA"), "data irreconhecível deve ser recusada");
  const dataFutura = buildDivergenceRecord({ name: "x", inventoryDate: "12/11/2099", dataset });
  assert.ok(!("error" in dataFutura), "data futura NÃO deve ser bloqueada (só data real é exigida)");

  // 2. Primeira gravação com data não normalizada
  const saved1 = await createDivergenceAnalysis(orgId, build("analise-1", "9/11/2026"));
  assert.ok(typeof saved1 === "object" && "id" in saved1, "primeira gravação deve salvar");
  assert.equal(saved1.inventoryDate, "09/11/2026", "data deve ser normalizada para DD/MM/AAAA");

  // 3. Mesmo conteúdo + mesma data (mesmo escrita de outra forma) = duplicata
  const dup1 = await createDivergenceAnalysis(orgId, build("analise-1-copia", "09/11/2026"));
  assert.ok(typeof dup1 === "object" && "duplicate" in dup1, "mesmo CSV + mesma data deve ser duplicata");

  // 4. Mesmo conteúdo + data DIFERENTE = legítimo, deve salvar
  const saved2 = await createDivergenceAnalysis(orgId, build("analise-2-outra-data", "12/11/2026"));
  assert.ok(typeof saved2 === "object" && "id" in saved2, "mesmo CSV em outra data deve ser permitido");

  // 5. Sem data: primeira salva, repetição é duplicata
  const saved3 = await createDivergenceAnalysis(orgId, build("analise-3-sem-data", ""));
  assert.ok(typeof saved3 === "object" && "id" in saved3, "sem data deve salvar");
  const dup3 = await createDivergenceAnalysis(orgId, build("analise-3-sem-data-copia", ""));
  assert.ok(typeof dup3 === "object" && "duplicate" in dup3, "sem data repetida deve ser duplicata");

  // 6. Conteúdo diferente na mesma data = não é duplicata
  const outroDataset: Dataset = { ...dataset, items: [item("9", 1, 1, 0, 1)] };
  const saved4 = await createDivergenceAnalysis(orgId, build("analise-4-outro-conteudo", "09/11/2026", outroDataset));
  assert.ok(typeof saved4 === "object" && "id" in saved4, "conteúdo diferente na mesma data deve salvar");

  // 7. Concorrência: 5 gravações idênticas em paralelo -> exatamente 1 salva
  const resultados = await Promise.all(
    Array.from({ length: 5 }, (_, i) => createDivergenceAnalysis(orgId, build(`concorrencia-${i}`, "13/11/2026", outroDataset))),
  );
  const salvos = resultados.filter((r) => typeof r === "object" && "id" in r);
  const duplicatas = resultados.filter((r) => typeof r === "object" && "duplicate" in r);
  assert.equal(salvos.length, 1, `concorrência: exatamente 1 gravação deve vencer (vieram ${salvos.length})`);
  assert.equal(duplicatas.length, 4, "concorrência: as outras 4 devem ser reconhecidas como duplicata");

  // 8. Contador do limite bate com o número real de análises (duplicatas não gastam vaga)
  const meta = await prisma.divergenceAnalysisMeta.findUnique({ where: { organizationId: orgId } });
  const total = await prisma.divergenceAnalysis.count({ where: { organizationId: orgId } });
  assert.equal(total, 5, "devem existir 5 análises salvas");
  assert.equal(meta?.analysisCount, 5, "contador deve ignorar duplicatas recusadas");

  console.log("OK: integração isolada passou (validação, dedup com data, concorrência, contador).");
} finally {
  // Limpeza: apagar a organização de teste remove análises e meta em cascata.
  await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
  const resto = await prisma.divergenceAnalysis.count({ where: { organizationId: orgId } });
  assert.equal(resto, 0, "limpeza deve remover as análises de teste");
  await prisma.$disconnect();
  console.log("Limpeza concluída: organização e análises de teste removidas da branch isolada.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
