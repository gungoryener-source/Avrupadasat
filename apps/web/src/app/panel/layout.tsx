import type { Metadata } from "next";
import { packages } from "@avrupadasat/core/pricing";
import { forTenant } from "@avrupadasat/db";
import { AppShell, type NavGroup } from "@/components/AppShell";
import { db } from "@/server/db";
import { unreadCount } from "@/server/notifications";
import { requireClient } from "@/server/session";
import { getT } from "@/i18n/server";
import "../app.css";

export const metadata: Metadata = {
  title: "Müşteri paneli",
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const s = await requireClient();
  const { t, locale } = await getT();
  const tdb = forTenant(db(), s.actor.tenantId);
  const [tenant, unread, myTasks, waitingTickets, processing] = await Promise.all([
    db().tenant.findUniqueOrThrow({
      where: { id: s.actor.tenantId },
      select: { name: true, packageCode: true },
    }),
    unreadCount(s.actor.userId),
    tdb.task.count({
      where: { customerVisible: true, customerAction: true, status: { not: "COMPLETED" } },
    }),
    tdb.ticket.count({ where: { status: "WAITING_CUSTOMER" } }),
    tdb.order.count({ where: { status: { in: ["NEW", "ALLOCATED", "PACKED", "ON_HOLD"] } } }),
  ]);
  const pkg = tenant.packageCode ? packages[tenant.packageCode as keyof typeof packages] : null;
  const groups: NavGroup[] = [
    { items: [{ href: "/panel", label: t("nav.overview"), icon: "home", exact: true }] },
    {
      title: t("nav.company"),
      items: [
        { href: "/panel/sirketim", label: t("nav.myCompany"), icon: "building" },
        { href: "/panel/sirket", label: t("nav.formation"), icon: "layers" },
        { href: "/panel/vergi", label: t("nav.tax"), icon: "receipt" },
        { href: "/panel/belgeler", label: t("nav.documents"), icon: "folder" },
      ],
    },
    {
      title: t("nav.operations"),
      items: [
        { href: "/panel/stok", label: t("nav.stock"), icon: "box" },
        { href: "/panel/siparisler", label: t("nav.orders"), icon: "cart", badge: processing },
        { href: "/panel/iadeler", label: t("nav.returns"), icon: "return" },
        { href: "/panel/pazaryerleri", label: t("nav.marketplaces"), icon: "plug" },
      ],
    },
    {
      title: t("nav.account"),
      items: [
        { href: "/panel/gorevler", label: t("nav.tasks"), icon: "checklist", badge: myTasks },
        { href: "/panel/destek", label: t("nav.support"), icon: "lifebuoy", badge: waitingTickets },
        { href: "/panel/abonelik", label: t("nav.billing"), icon: "card" },
        { href: "/panel/ayarlar", label: t("nav.settings"), icon: "settings" },
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
      root={t("shell.panel")}
      locale={locale}
      strings={{
        plan: t("shell.plan"),
        help: t("shell.help"),
        security: t("shell.security"),
        logout: t("shell.logout"),
        notifications: t("shell.notifications"),
        unread: t("shell.unread"),
        language: t("shell.language"),
        languageNote: t("shell.languageNote"),
        search: t("shell.search"),
        searchPlaceholder: t("shell.searchPlaceholder"),
        searching: t("shell.searching"),
        noResults: t("shell.noResults"),
        kinds: {
          page: t("shell.kind.page"),
          order: t("shell.kind.order"),
          product: t("shell.kind.product"),
          ticket: t("shell.kind.ticket"),
          tenant: t("shell.kind.tenant"),
        },
        collapse: t("shell.collapse"),
        expand: t("shell.expand"),
        collapseLong: t("shell.collapseLong"),
        menuOpen: t("shell.menuOpen"),
        menuClose: t("shell.menuClose"),
      }}
      helpHref="/panel/destek/yeni"
      plan={{
        name: pkg?.name ?? t("shell.noPlan"),
        href: "/panel/abonelik",
        cta:
          tenant.packageCode === "PAZARA_GIRIS"
            ? undefined
            : pkg
              ? t("shell.upgrade")
              : t("shell.choosePlan"),
      }}
    >
      {children}
    </AppShell>
  );
}
