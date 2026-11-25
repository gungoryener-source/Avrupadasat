import Link from "next/link";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const s = await requireStaff();
  const sp = await searchParams;
  const prisma = db();
  const [newLeads, openQuotes, onboarding, active, pendingEvents, failedEvents] = await Promise.all(
    [
      prisma.lead.count({ where: { status: "NEW" } }),
      prisma.quote.count({ where: { status: "SENT" } }),
      prisma.tenant.count({ where: { status: "ONBOARDING" } }),
      prisma.tenant.count({ where: { status: "ACTIVE" } }),
      prisma.outboxEvent.count({ where: { processedAt: null, attempts: { lt: 5 } } }),
      prisma.outboxEvent.count({ where: { processedAt: null, attempts: { gte: 5 } } }),
    ],
  );
  const kpis = [
    ["Yeni talep", newLeads, "/admin/talepler?durum=NEW"],
    ["Yanıt bekleyen teklif", openQuotes, "/admin/teklifler"],
    ["Kuruluş sürecinde", onboarding, "/admin/musteriler"],
    ["Aktif müşteri", active, "/admin/musteriler"],
    ["Bekleyen olay", pendingEvents, null],
    ["Başarısız olay", failedEvents, null],
  ] as const;
  return (
    <>
      <h1>Merhaba, {s.name.split(" ")[0]}</h1>
      {sp.hata === "yetki" && <p className="alert-err">Bu sayfa için yetkiniz yok.</p>}
      <div className="kpis">
        {kpis.map(([l, v, href]) => (
          <div key={l} className="card kpi">
            <div className="l">{l}</div>
            <div
              className="v"
              style={l === "Başarısız olay" && v > 0 ? { color: "var(--p)" } : undefined}
            >
              {href ? (
                <Link href={href} style={{ textDecoration: "none" }}>
                  {v}
                </Link>
              ) : (
                v
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
