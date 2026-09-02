import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { getOptionalSessionContext } from "@/lib/session";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Inventara",
    template: "%s | Inventara",
  },
  description: "Gestao e priorizacao de inventarios.",
  applicationName: "Inventara",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Inventara",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#173e32" },
    { media: "(prefers-color-scheme: dark)", color: "#0d141c" },
  ],
};

const themeScript = `(() => {
  try {
    const stored = localStorage.getItem("inventara-theme");
    const theme = stored === "light" || stored === "dark"
      ? stored
      : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {}
})()`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getOptionalSessionContext();

  return (
    <html lang="pt-BR" className={`${manrope.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppShell user={session?.user ?? null}>{children}</AppShell>
      </body>
    </html>
  );
}
