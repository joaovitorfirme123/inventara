import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Entrar" };

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const requestedPath = typeof params.next === "string" ? params.next : "/";
  const redirectTo = requestedPath.startsWith("/") && !requestedPath.startsWith("//")
    ? requestedPath
    : "/";

  return (
    <section className="login-card">
      <div className="login-brand">
        <span>I</span>
        <div><strong>INVENTARA</strong><small>Inventory intelligence</small></div>
      </div>
      <div className="login-copy">
        <span className="eyebrow">Acesso seguro</span>
        <h1>Entre na sua organização.</h1>
        <p>Use as credenciais vinculadas à empresa para acessar produtos, importações e prioridades.</p>
      </div>
      <LoginForm redirectTo={redirectTo} />
    </section>
  );
}
