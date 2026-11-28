import type { Metadata } from "next";
import { can, ROLE_LABEL, type Permission } from "@avrupadasat/core/roles";
import { AppShell, type NavGroup } from "@/components/AppShell";
import type { IconKey } from "@/components/panel/ShellNav";
import { db } from "@/server/db";
import { unreadCount } from "@/server/notifications";
import { requireStaff } from "@/server/session";
import "../app.css";

export const metadata: Metadata = { title: "Ekip paneli", robots: { index: false, follow: false } };

type Item = {
  href: string;
  label: string;
  icon: IconKey;
  perm?: Permission;
  exact?: boolean;
  badge?: number;
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await requireStaff();
  const r = s.actor.role;
  const [unread, openTickets, pendingDocs, myTasks] = await Promise.all([
    unreadCount(s.actor.userId),
    can(r, "ticket.read")
      ? db().ticket.count({ where: { status: { in: ["OPEN", "WAITING_TEAM"] } } })
      : 0,
    can(r, "document.review") ? db().document.count({ where: { review: "PENDING" } }) : 0,
    can(r, "task.read")
      ? db().task.count({ where: { assigneeId: s.actor.userId, status: { not: "COMPLETED" } } })
      : 0,
  ]);
  const raw: { title?: string; items: Item[] }[] = [
    { items: [{ href: "/admin", label: "Panel", icon: "home", exact: true }] },
    {
      title: "Müşteri",
      items: [
        { href: "/admin/musteriler", label: "Müşteriler", icon: "users", perm: "tenant.read" },
        { href: "/admin/talepler", label: "Başvurular", icon: "inbox", perm: "lead.read" },
        { href: "/admin/teklifler", label: "Teklifler", icon: "file", perm: "lead.read" },
      ],
    },
    {
      title: "Operasyon",
      items: [
        {
          href: "/admin/gorevler",
          label: "Görevler",
          icon: "checklist",
          perm: "task.read",
          badge: myTasks,
        },
        {
          href: "/admin/sirket-islemleri",
          label: "Şirket işlemleri",
          icon: "layers",
          perm: "tenant.read",
        },
        { href: "/admin/vergi", label: "Vergi işlemleri", icon: "receipt", perm: "tax.read" },
        {
          href: "/admin/belgeler",
          label: "Belgeler",
          icon: "folder",
          perm: "document.review",
          badge: pendingDocs,
        },
        { href: "/admin/stok", label: "Depo ve stok", icon: "box", perm: "stock.read" },
        {
          href: "/admin/sevkiyatlar",
          label: "Sevkiyatlar",
          icon: "truck",
          perm: "shipment.read",
        },
        { href: "/admin/siparisler", label: "Siparişler", icon: "cart", perm: "order.read" },
        { href: "/admin/iadeler", label: "İadeler", icon: "return", perm: "order.read" },
        {
          href: "/admin/destek",
          label: "Destek talepleri",
          icon: "lifebuoy",
          perm: "ticket.read",
          badge: openTickets,
        },
        {
          href: "/admin/mesajlar",
          label: "Alıcı mesajları",
          icon: "message",
          perm: "message.read",
        },
      ],
    },
    {
      title: "Finans",
      items: [
        { href: "/admin/abonelikler", label: "Abonelikler", icon: "card", perm: "invoice.read" },
        {
          href: "/admin/faturalar",
          label: "Ödemeler ve faturalar",
          icon: "receipt",
          perm: "invoice.read",
        },
      ],
    },
    {
      title: "Yönetim",
      items: [
        {
          href: "/admin/personel",
          label: "Personel ve yetkiler",
          icon: "shield",
          perm: "staff.manage",
        },
        { href: "/admin/raporlar", label: "Raporlar", icon: "chart", perm: "tenant.read" },
        { href: "/admin/ayarlar", label: "Ayarlar", icon: "settings", perm: "audit.read" },
      ],
    },
  ];
  const groups: NavGroup[] = raw
    .map((g) => ({
      title: g.title,
      items: g.items
        .filter((i) => !i.perm || can(r, i.perm))
        // Depo personeli (PARTNER) yalnız atandığı firmaların operasyonunu görür
        .filter(
          (i) =>
            r !== "PARTNER" ||
            [
              "/admin",
              "/admin/stok",
              "/admin/sevkiyatlar",
              "/admin/siparisler",
              "/admin/iadeler",
            ].includes(i.href),
        )
        .map((i) => ({
          href: i.href,
          label: i.label,
          icon: i.icon,
          exact: i.exact,
          badge: i.badge,
        })),
    }))
    .filter((g) => g.items.length);
  return (
    <AppShell
      groups={groups}
      user={s.name}
      subtitle={ROLE_LABEL[r]}
      context="Ekip paneli"
      unread={unread}
      bellHref="/admin/bildirimler"
      home="/admin"
      root="Ekip paneli"
    >
      {children}
    </AppShell>
  );
}
