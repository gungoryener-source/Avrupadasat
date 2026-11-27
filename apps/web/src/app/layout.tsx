import type { Metadata } from "next";
import { headers } from "next/headers";
import { brand } from "@avrupadasat/core/brand.config";
import { JsonLd, organizationLd } from "@/components/site/JsonLd";
import "@fontsource-variable/inter";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${brand.name} — ${brand.slogan.replace(/\.$/, "")}`,
    template: `%s | ${brand.name}`,
  },
  description:
    "Türk üretici ve ihracatçılar için Almanya'da şirket kuruluşu, depo, gümrük ve Amazon.de satışı: tek ekip, Türkçe, şeffaf fiyat.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "tr_TR", siteName: brand.name },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce okumak sayfayı istek anında üretir (nonce'lı CSP'nin gereği)
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="tr">
      <body>
        <JsonLd data={organizationLd()} nonce={nonce} />
        {children}
      </body>
    </html>
  );
}
