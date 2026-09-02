"use client";

import { useEffect, useSyncExternalStore } from "react";

type ThemePreference = "system" | "light" | "dark";
const STORAGE_KEY = "inventara-theme";

function resolveTheme(preference: ThemePreference) {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function readPreference(): ThemePreference {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function subscribeToPreference(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", onChange);
  window.addEventListener("inventara-theme-change", onChange);
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("inventara-theme-change", onChange);
    media.removeEventListener("change", onChange);
  };
}

export function ThemeToggle() {
  const preference = useSyncExternalStore<ThemePreference>(subscribeToPreference, readPreference, () => "system");

  useEffect(() => {
    applyTheme(preference);
  }, [preference]);

  function cycleTheme() {
    const next: ThemePreference = preference === "system" ? "dark" : preference === "dark" ? "light" : "system";
    if (next === "system") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event("inventara-theme-change"));
  }

  const labels: Record<ThemePreference, string> = { system: "Sistema", light: "Claro", dark: "Escuro" };
  return (
    <button
      aria-label="Alternar tema visual"
      className="theme-toggle"
      onClick={cycleTheme}
      suppressHydrationWarning
      title="Alternar tema visual"
      type="button"
    >
      {`Tema: ${labels[preference]}`}
    </button>
  );
}
