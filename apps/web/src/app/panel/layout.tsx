import type { Metadata } from "next";
import { forTenant } from "@avrupadasat/db";
import { AppShell, type NavGroup } from "@/components/AppShell";
import { db } from "@/server/db";
import { unreadCount } from "@/server/notifications";
import { requireClient } from "@/server/session";
import "../app.css";

export const metadata: Metadata = {
  title: "Müşteri paneli",
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const s = await requireClient();
  const t = forTenant(db(), s.actor.tenantId);
  const [tenant, unread, myTasks, waitingTickets] = await Promise.all([
    db().tenant.findUniqueOrThrow({ where: { id: s.actor.tenantId }, select: { name: true } }),
    unreadCount(s.actor.userId),
    t.task.count({
      where: { customerVisible: true, customerAction: true, status: { not: "COMPLETED" } },
    }),
    t.ticket.count({ where: { status: "WAITING_CUSTOMER" } }),
  ]);
  const groups: NavGroup[] = [
    { items: [{ href: "/panel", label: "Genel Bakış", icon: "home", exact: true }] },
    {
      title: "Şirket",
      items: [
        { href: "/panel/sirketim", label: "Şirketim", icon: "building" },
        { href: "/panel/sirket", label: "Şirket Kuruluşu", icon: "layers" },
        { href: "/panel/vergi", label: "Vergi ve Muhasebe", icon: "receipt" },
        { href: "/panel/belgeler", label: "Belgelerim", icon: "folder" },
      ],
    },
    {
      title: "Operasyon",
      items: [
        { href: "/panel/stok", label: "Depo ve Stok", icon: "box" },
        { href: "/panel/siparisler", label: "Siparişler", icon: "cart" },
        { href: "/panel/iadeler", label: "İadeler", icon: "return" },
        { href: "/panel/pazaryerleri", label: "Pazaryerleri", icon: "plug" },
      ],
    },
    {
      title: "Hesap",
      items: [
        { href: "/panel/gorevler", label: "Görevlerim", icon: "checklist", badge: myTasks },
        { href: "/panel/destek", label: "Destek Merkezi", icon: "lifebuoy", badge: waitingTickets },
        { href: "/panel/abonelik", label: "Abonelik ve Ödemeler", icon: "card" },
        { href: "/panel/ayarlar", label: "Ayarlar", icon: "settings" },
      ],
    },
  ];
  return (
    <AppShell
      groups={groups}
      user={s.name}
      subtitle={tenant.name}
      context={tenant.name}
      unread={unread}
      bellHref="/panel/bildirimler"
      home="/panel"
    >
      {children}
    </AppShell>
  );
}
