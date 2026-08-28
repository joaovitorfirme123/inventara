"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/", label: "Dashboard", code: "01" },
  { href: "/produtos", label: "Produtos", code: "02" },
  { href: "/inventarios", label: "Inventários", code: "03" },
  { href: "/importacoes", label: "Importações", code: "04" },
  { href: "/estoque", label: "Estoque", code: "05" },
  { href: "/configuracoes", label: "Configurações", code: "06" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
            <span>OR</span>
            <div>
              <strong>Organização</strong>
              <small>Ambiente local</small>
            </div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
