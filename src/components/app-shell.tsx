"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    }).catch(() => {
      // PWA support is optional and must not block the application shell.
    });
  }, []);

  useEffect(() => {
    // pathname change must close drawer; intentional sync reset.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => {
      sidebarRef.current?.querySelector<HTMLAnchorElement>(".nav-link")?.focus();
    });
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
      if (event.key !== "Tab" || !sidebarRef.current) return;

      const focusable = Array.from(
        sidebarRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      cancelAnimationFrame(focusFrame);
      menuButton?.focus();
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    const workspace = workspaceRef.current;
    if (!sidebar || !workspace) return;

    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const syncMobileIsolation = () => {
      const isMobile = mediaQuery.matches;
      sidebar.toggleAttribute("inert", isMobile && !isMobileMenuOpen);
      workspace.toggleAttribute("inert", isMobile && isMobileMenuOpen);
      sidebar.setAttribute("aria-hidden", isMobile && !isMobileMenuOpen ? "true" : "false");
    };

    syncMobileIsolation();
    mediaQuery.addEventListener("change", syncMobileIsolation);
    return () => mediaQuery.removeEventListener("change", syncMobileIsolation);
  }, [isMobileMenuOpen]);

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
      <aside
        className={`sidebar ${isMobileMenuOpen ? "open" : ""}`}
        aria-label="Navegação principal lateral"
        id="sidebar"
        ref={sidebarRef}
      >
        <Link className="brand" href="/" aria-label="Inventara - Dashboard" onClick={() => setIsMobileMenuOpen(false)}>
          <span className="brand-mark">I</span>
          <span>
            <strong>INVENTARA</strong>
            <small>Inventory intelligence</small>
          </span>
        </Link>
        <button
          aria-label="Fechar menu"
          className="sidebar-close"
          onClick={() => setIsMobileMenuOpen(false)}
          type="button"
        >
          ×
        </button>

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
                onClick={() => setIsMobileMenuOpen(false)}
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
              onClick={() => setIsMobileMenuOpen(false)}
            >
                <span>10</span>
              Administração
            </Link>
          )}
        </nav>

        <div className="sidebar drawer-org-card" aria-label="Organização atual">
          <span>{initials}</span>
          <div>
            <strong>{user?.organizationName ?? "Plataforma"}</strong>
            <small>{user?.name ?? "Sessão local"}</small>
            <small>{user?.email ?? ""}</small>
          </div>
        </div>

        <div className="sidebar-footer">
          <span>Ambiente</span>
          <strong>Desenvolvimento</strong>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <button
          aria-label="Fechar menu"
          className="sidebar-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          type="button"
        />
      )}

      <div className="workspace" ref={workspaceRef}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              aria-expanded={isMobileMenuOpen}
              aria-controls="sidebar"
              aria-label={isMobileMenuOpen ? "Fechar navegação" : "Abrir navegação"}
              className="mobile-menu-button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              ref={menuButtonRef}
              type="button"
            >
              <span />
              <span />
              <span />
            </button>
            <span className="signal-dot" aria-hidden />
            <span className="topbar-label">Sistema operacional</span>
          </div>
          <div className="organization-chip">
            <span aria-hidden>{initials}</span>
            <div className="organization-chip-text">
              <strong>{user?.organizationName ?? "Plataforma"}</strong>
              <small>{user?.name ?? "Sessão local"}</small>
            </div>
            <ThemeToggle />
            <button disabled={isSigningOut} onClick={signOut} type="button">
              {isSigningOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        </header>
        <main className="content" id="main-content" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
