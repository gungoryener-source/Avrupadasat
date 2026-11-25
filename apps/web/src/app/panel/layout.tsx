import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { db } from "@/server/db";
import { requireClient } from "@/server/session";

export const metadata: Metadata = {
  title: "Müşteri paneli",
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const s = await requireClient();
  const tenant = await db().tenant.findUniqueOrThrow({
    where: { id: s.actor.tenantId },
    select: { name: true },
  });
  const nav = [
    { href: "/panel", label: "Genel bakış" },
    { href: "/panel/sirket", label: "Şirket kuruluşu" },
    { href: "/panel/sevkiyatlar", label: "Sevkiyatlar" },
    { href: "/panel/stok", label: "Stok" },
    { href: "/panel/siparisler", label: "Siparişler & iadeler" },
    { href: "/panel/belgeler", label: "Belgeler" },
    { href: "/panel/mesajlar", label: "Müşteri mesajları" },
    { href: "/panel/faturalar", label: "Faturalar" },
    { href: "/panel/kullanicilar", label: "Kullanıcılar" },
  ];
  return (
    <AppShell nav={nav} user={s.name} subtitle={tenant.name}>
      {children}
    </AppShell>
  );
}
