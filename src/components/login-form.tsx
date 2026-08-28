"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsPending(true);
    const form = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
      rememberMe: form.get("rememberMe") === "on",
    });

    if (result.error) {
      setError("E-mail ou senha inválidos.");
      setIsPending(false);
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label>
        <span>E-mail</span>
        <input autoComplete="email" name="email" required type="email" />
      </label>
      <label>
        <span>Senha</span>
        <input autoComplete="current-password" minLength={8} name="password" required type="password" />
      </label>
      <label className="remember-field">
        <input defaultChecked name="rememberMe" type="checkbox" />
        <span>Manter sessão neste dispositivo</span>
      </label>
      {error && <p className="login-error" role="alert">{error}</p>}
      <button disabled={isPending} type="submit">
        {isPending ? "Entrando..." : "Entrar no sistema"}
      </button>
    </form>
  );
}
