import "server-only";
import type { InventoryRow } from "@/data/inventories";

const MAX_CONTEXT_ROWS = 400;

type AssistantResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

function createContext(rows: InventoryRow[]) {
  const rankedRows = [...rows]
    .sort((left, right) => right.score - left.score || right.pendingSkus - left.pendingSkus)
    .slice(0, MAX_CONTEXT_ROWS);

  return {
    grupos: rankedRows.map((row) => ({
      secao: row.section,
      grupo: row.group,
      subgrupo: row.subgroup,
      prioridade: row.priority,
      pontuacao: Number(row.score.toFixed(1)),
      skus: row.totalSkus,
      pendentes: row.pendingSkus,
      cobertura_percentual: row.countedPercentage,
      sem_data: row.noDateSkus,
      data_pendente_mais_antiga: row.oldestPendingDate?.toISOString().slice(0, 10) ?? null,
    })),
    observacao:
      rows.length > MAX_CONTEXT_ROWS
        ? `Amostra limitada aos ${MAX_CONTEXT_ROWS} grupos mais prioritários de ${rows.length}.`
        : "Todos os grupos disponíveis foram incluídos.",
  };
}

export async function askInventoryAssistant(question: string, rows: InventoryRow[]) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("ASSISTANT_NOT_CONFIGURED");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content: [
            "Você é o assistente operacional da Inventara.",
            "Responda em português do Brasil, de forma objetiva e prática.",
            "Use exclusivamente os dados do contexto fornecido para recomendar subgrupos de inventário.",
            "Explique a recomendação citando seção, grupo, subgrupo, prioridade, pendências e cobertura quando disponíveis.",
            "Não invente números, produtos ou informações que não estejam no contexto.",
            "Se a pergunta não puder ser respondida com segurança pelos dados, diga isso claramente.",
            "Você é somente leitura: não diga que executou ações e não sugira que pode alterar dados.",
            `Contexto atual: ${JSON.stringify(createContext(rows))}`,
          ].join("\n"),
        },
        { role: "user", content: question },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    console.error("Inventory assistant provider failed", { status: response.status });
    throw new Error("ASSISTANT_PROVIDER_FAILED");
  }

  const body = (await response.json()) as AssistantResponse;
  const answer = body.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("ASSISTANT_EMPTY_RESPONSE");
  return answer;
}
