import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import { AppShell } from "@/components/app-shell";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${geistMono.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
