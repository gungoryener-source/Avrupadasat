import Link from "next/link";
import { can } from "@avrupadasat/core/roles";
import { Card, PageHeader, Stat } from "@/components/panel/ui";
import { nowMs } from "@/server/clock";
import { db } from "@/server/db";
import { CHANNEL_LABEL } from "@/server/labels-ops";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Raporlar" };

/** Yalnız veritabanından hesaplanan sayılar; tahmin veya örnek değer gösterilmez */
export default async function Reports() {
  const s = await requireStaff("tenant.read");
  const r = s.actor.role;
  const since = new Date(nowMs() - 30 * 86400_000);
  const [
    tenants,
    orders,
    ordersByChannel,
    ticketsOpened,
    ticketsResolved,
    tasksDone,
    docsReviewed,
    leads,
  ] = await Promise.all([
    db().tenant.groupBy({ by: ["status"], _count: true }),
    db().order.count({ where: { orderedAt: { gte: since } } }),
    db().order.groupBy({
      by: ["channel"],
      _count: true,
      where: { orderedAt: { gte: since } },
    }),
    db().ticket.count({ where: { createdAt: { gte: since } } }),
    db().ticket.count({
      where: { status: { in: ["RESOLVED", "CLOSED"] }, lastActivity: { gte: since } },
    }),
    db().task.count({ where: { completedAt: { gte: since } } }),
    db().document.count({ where: { reviewedAt: { gte: since } } }),
    db().lead.count({ where: { createdAt: { gte: since } } }),
  ]);
  const ts = (k: string) => tenants.find((t) => t.status === k)?._count ?? 0;
  const links = [
    {
      href: "/admin/partnerler",
      label: "Partner performans karnesi",
      desc: "Depo ve hizmet ortaklarının SLA sonuçları",
      perm: "tenant.read" as const,
    },
    {
      href: "/admin/disa-aktar",
      label: "Muhasebe dışa aktarımı (DATEV)",
      desc: "Kesilmiş faturalar ve satış raporu CSV",
      perm: "data.export" as const,
    },
    {
      href: "/admin/audit",
      label: "Denetim kaydı",
      desc: "Giriş, yetki, dışa aktarma ve kayıt değişiklikleri",
      perm: "audit.read" as const,
    },
  ].filter((l) => can(r, l.perm));
  return (
    <>
      <PageHeader title="Raporlar" desc="Son 30 gün, sistemdeki kayıtlardan hesaplanır." />
      <div className="stats" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
        <Stat label="Aktif müşteri" value={ts("ACTIVE")} hint={`${ts("ONBOARDING")} kuruluşta`} />
        <Stat label="Yeni başvuru" value={leads} hint="30 gün" />
        <Stat label="Sipariş" value={orders} hint="30 gün, tüm kanallar" />
        <Stat label="Çözülen destek" value={ticketsResolved} hint={`${ticketsOpened} yeni talep`} />
      </div>
      <div className="grid grid-2">
        <Card title="Kanallara göre sipariş (30 gün)">
          {ordersByChannel.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Bu dönemde sipariş yok.
            </p>
          ) : (
            <dl className="kv">
              {ordersByChannel.map((c) => (
                <div key={c.channel} style={{ display: "contents" }}>
                  <dt>{CHANNEL_LABEL[c.channel]}</dt>
                  <dd>{c._count}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
        <Card title="Ekip çıktısı (30 gün)">
          <dl className="kv">
            <dt>Tamamlanan görev</dt>
            <dd>{tasksDone}</dd>
            <dt>İncelenen belge</dt>
            <dd>{docsReviewed}</dd>
            <dt>Çözülen/kapanan talep</dt>
            <dd>{ticketsResolved}</dd>
          </dl>
        </Card>
      </div>
      {links.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Card title="Ayrıntılı raporlar">
            <ul className="ls">
              {links.map((l) => (
                <li key={l.href}>
                  <div className="ls-main">
                    <Link href={l.href}>{l.label}</Link>
                    <small>{l.desc}</small>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
