"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

const navigation = [
  { href: "/", label: "Dashboard", code: "01" },
  { href: "/produtos", label: "Produtos", code: "02" },
  { href: "/inventarios", label: "Inventários", code: "03" },
  { href: "/planejamento", label: "Planejamento", code: "04" },
  { href: "/importacoes", label: "Importações", code: "05" },
  { href: "/estoque", label: "Estoque", code: "06" },
  { href: "/notificacoes", label: "Notificações", code: "07" },
  { href: "/relatorios", label: "Relatórios", code: "08" },
  { href: "/configuracoes", label: "Configurações", code: "09" },
];

type AppShellProps = {
  children: React.ReactNode;
  user: {
    id: string;
    name: string;
    email: string;
    role: "PLATFORM_ADMIN" | "OWNER" | "MEMBER";
    organizationId: string | null;
    organizationName: string | null;
  } | null;
};

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (pathname === "/login" || pathname.startsWith("/convites/")) {
    return <main className="auth-page">{children}</main>;
  }

  const initials = user?.organizationName
    ? user.organizationName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : user?.role === "PLATFORM_ADMIN"
      ? "AD"
      : "OR";

  async function signOut() {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
    } finally {
      // Logout must hard-reset the client auth state, bypassing the router cache.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Inventara - Dashboard">
          <span className="brand-mark">I</span>
          <span>
            <strong>INVENTARA</strong>
            <small>Inventory intelligence</small>
          </span>
        </Link>

        <nav className="main-nav" aria-label="Navegação principal">
          {navigation.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                className={isActive ? "nav-link active" : "nav-link"}
                href={item.href}
                key={item.href}
                aria-current={isActive ? "page" : undefined}
              >
                <span>{item.code}</span>
                {item.label}
              </Link>
            );
          })}
          {user?.role === "PLATFORM_ADMIN" && (
            <Link
              className={pathname.startsWith("/admin") ? "nav-link active" : "nav-link"}
              href="/admin/organizacoes"
              aria-current={pathname.startsWith("/admin") ? "page" : undefined}
            >
                <span>10</span>
              Administração
            </Link>
          )}
        </nav>

        <div className="sidebar-footer">
          <span>Ambiente</span>
          <strong>Desenvolvimento</strong>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="signal-dot" />
            Sistema operacional
          </div>
          <div className="organization-chip">
            <span>{initials}</span>
            <div>
            <strong>{user?.organizationName ?? "Plataforma"}</strong>
              <small>{user?.name ?? "Sessão local"}</small>
            </div>
            <button disabled={isSigningOut} onClick={signOut} type="button">
              {isSigningOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
