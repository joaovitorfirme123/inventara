"use client";

import { useState } from "react";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "Quais subgrupos devo priorizar primeiro?",
  "Qual seção está com menor cobertura?",
  "Por que este recorte está urgente?",
];

export function InventoryAssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "assistant",
      content: "Posso ajudar a interpretar as prioridades de inventário da sua organização. Pergunte sobre cobertura, pendências ou a ordem recomendada de contagem.",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentQuestion = question.trim();
    if (!currentQuestion || isLoading) return;

    setQuestion("");
    setError("");
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", content: currentQuestion },
    ]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQuestion }),
      });
      const body = (await response.json().catch(() => null)) as { answer?: string; error?: string } | null;
      if (!response.ok || !body?.answer) {
        throw new Error(body?.error ?? "Não foi possível consultar o assistente agora.");
      }
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: "assistant", content: body.answer as string },
      ]);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Não foi possível consultar o assistente agora.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <section className="assistant-panel panel">
      <div className="assistant-transcript" aria-live="polite">
        {messages.map((message) => (
          <article className={`assistant-message ${message.role}`} key={message.id}>
            <span>{message.role === "assistant" ? "Inventara IA" : "Você"}</span>
            <p>{message.content}</p>
          </article>
        ))}
        {isLoading ? <p className="assistant-loading">Analisando as prioridades atuais...</p> : null}
      </div>

      <div className="assistant-suggestions">
        <span>Sugestões</span>
        {suggestions.map((suggestion) => (
          <button key={suggestion} onClick={() => setQuestion(suggestion)} type="button">{suggestion}</button>
        ))}
      </div>

      <form className="assistant-form" onSubmit={ask}>
        <label>
          <span>Pergunta</span>
          <textarea
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ex.: quais subgrupos devo contar primeiro?"
            value={question}
          />
        </label>
        <button disabled={isLoading || !question.trim()} type="submit">{isLoading ? "Consultando..." : "Perguntar"}</button>
        <small>Use Ctrl + Enter para enviar. O assistente apenas consulta os dados atuais.</small>
      </form>
      {error ? <p className="assistant-error" role="alert">{error}</p> : null}
    </section>
  );
}
