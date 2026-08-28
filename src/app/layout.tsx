import type { Metadata } from "next";
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
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getOptionalSessionContext();

  return (
    <html lang="pt-BR" className={`${manrope.variable} ${geistMono.variable}`}>
      <body>
        <AppShell user={session?.user ?? null}>{children}</AppShell>
      </body>
    </html>
  );
}
