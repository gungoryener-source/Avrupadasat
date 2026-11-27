import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { can, canAccessTenant } from "@avrupadasat/core/roles";
import { fmtDate } from "@/components/AppShell";
import { Badge, PageHeader, Tabs, sp } from "@/components/panel/ui";
import { db } from "@/server/db";
import { PACKAGE_LABEL, TENANT_STATUS } from "@/server/labels";
import { requireStaff } from "@/server/session";
import { BillingTab } from "./_tabs/billing";
import { CompanyTab } from "./_tabs/company";
import { DocumentsTab } from "./_tabs/documents";
import { HistoryTab } from "./_tabs/history";
import { OperationsTab } from "./_tabs/operations";
import { OrdersTab } from "./_tabs/orders";
import { OverviewTab } from "./_tabs/overview";
import { SupportTab } from "./_tabs/support";
import { WarehouseTab } from "./_tabs/warehouse";

export const metadata = { title: "Müşteri" };

const TABS = [
  { key: "genel", label: "Genel bakış", perm: "tenant.read" },
  { key: "sirket", label: "Şirket", perm: "tenant.read" },
  { key: "belgeler", label: "Belgeler", perm: "document.review" },
  { key: "operasyon", label: "Operasyon", perm: "task.read" },
  { key: "siparisler", label: "Siparişler", perm: "order.read" },
  { key: "depo", label: "Depo", perm: "stock.read" },
  { key: "fatura", label: "Faturalama", perm: "invoice.read" },
  { key: "destek", label: "Destek", perm: "ticket.read" },
  { key: "gecmis", label: "Geçmiş", perm: "audit.read" },
] as const;

export default async function TenantDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await requireStaff("tenant.read");
  const { id } = await params;
  const q = sp(await searchParams);
  // PARTNER yalnız atandığı firmayı açabilir; diğer firmaya erişim reddedilir
  if (!canAccessTenant(s.actor, id)) redirect("/admin?hata=yetki");
  const t = await db().tenant.findUnique({
    where: { id },
    select: { id: true, name: true, status: true, packageCode: true, createdAt: true, city: true },
  });
  if (!t) notFound();
  const tabs = TABS.filter((x) => can(s.actor.role, x.perm));
  const active = tabs.find((x) => x.key === q.sekme)?.key ?? "genel";
  const ctx = { tenantId: t.id, actor: s.actor, userId: s.userId, q };
  return (
    <>
      <PageHeader
        title={t.name}
        crumbs={[{ href: "/admin/musteriler", label: "Müşteriler" }]}
        desc={
          <>
            {t.packageCode ? PACKAGE_LABEL[t.packageCode] : "Paket yok"} · müşteri{" "}
            {fmtDate(t.createdAt)}
            {t.city ? ` · ${t.city}` : ""}
          </>
        }
        actions={
          <Badge
            tone={t.status === "ACTIVE" ? "green" : t.status === "ONBOARDING" ? "blue" : "neutral"}
          >
            {TENANT_STATUS[t.status]}
          </Badge>
        }
      />
      <Tabs
        active={active}
        items={tabs.map((x) => ({
          key: x.key,
          label: x.label,
          href: `/admin/musteriler/${t.id}${x.key === "genel" ? "" : `?sekme=${x.key}`}`,
        }))}
      />
      {active === "genel" && <OverviewTab {...ctx} />}
      {active === "sirket" && <CompanyTab {...ctx} />}
      {active === "belgeler" && <DocumentsTab {...ctx} />}
      {active === "operasyon" && <OperationsTab {...ctx} />}
      {active === "siparisler" && <OrdersTab {...ctx} />}
      {active === "depo" && <WarehouseTab {...ctx} />}
      {active === "fatura" && <BillingTab {...ctx} />}
      {active === "destek" && <SupportTab {...ctx} />}
      {active === "gecmis" && <HistoryTab {...ctx} />}
      <p className="muted" style={{ fontSize: 12, marginTop: 24 }}>
        <Link href="/admin/musteriler">← Müşteri listesi</Link>
      </p>
    </>
  );
}
