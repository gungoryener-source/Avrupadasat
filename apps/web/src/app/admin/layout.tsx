import type { Metadata } from "next";
import { can } from "@avrupadasat/core/roles";
import { AppShell } from "@/components/AppShell";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Ekip paneli", robots: { index: false, follow: false } };

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Yönetici",
  OPS: "Operasyon",
  FINANCE: "Finans",
  SALES: "Satış",
  PARTNER: "Partner",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireStaff();
  const r = s.actor.role;
  const nav = [
    { href: "/admin", label: "Genel bakış" },
    ...(can(r, "lead.read")
      ? [
          { href: "/admin/talepler", label: "Talepler" },
          { href: "/admin/teklifler", label: "Teklifler" },
        ]
      : []),
    ...(can(r, "tenant.read") ? [{ href: "/admin/musteriler", label: "Müşteriler" }] : []),
    ...(can(r, "shipment.read") ? [{ href: "/admin/sevkiyatlar", label: "Sevkiyatlar" }] : []),
    ...(can(r, "shipment.write")
      ? [{ href: "/admin/siparisler", label: "Siparişler & iadeler" }]
      : []),
    ...(can(r, "invoice.read") ? [{ href: "/admin/faturalar", label: "Faturalar" }] : []),
    ...(can(r, "tenant.read") ? [{ href: "/admin/mesajlar", label: "Müşteri mesajları" }] : []),
    ...(can(r, "tenant.read") ? [{ href: "/admin/partnerler", label: "Partner skor kartı" }] : []),
    ...(can(r, "audit.read") ? [{ href: "/admin/audit", label: "Audit log" }] : []),
  ];
  return (
    <AppShell nav={nav} user={s.name} subtitle={ROLE_LABEL[r] ?? r}>
      {children}
    </AppShell>
  );
}
