import Link from "next/link";
import { fmtDate } from "@/components/AppShell";
import { db } from "@/server/db";
import { TENANT_STATUS } from "@/server/labels";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Müşteriler" };

export default async function TenantsPage() {
  const s = await requireStaff("tenant.read");
  const where =
    s.actor.role === "PARTNER" ? { id: { in: [...(s.actor.partnerTenantIds ?? [])] } } : {};
  const tenants = await db().tenant.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { registration: true, _count: { select: { shipments: true, stockItems: true } } },
  });
  return (
    <>
      <h1>Müşteriler</h1>
      <table className="tbl">
        <thead>
          <tr>
            <th>Firma</th>
            <th>Paket</th>
            <th>Durum</th>
            <th>Kuruluş adımları</th>
            <th>Sevkiyat</th>
            <th>Başlangıç</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => {
            const done = t.registration.filter((r) => r.status === "TAMAM").length;
            return (
              <tr key={t.id}>
                <td>
                  <Link href={`/admin/musteriler/${t.id}`}>{t.name}</Link>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {t.city ?? ""}
                  </div>
                </td>
                <td>{t.packageCode ?? "—"}</td>
                <td>
                  <span className={`tag ${t.status === "ACTIVE" ? "ok" : "warn"}`}>
                    {TENANT_STATUS[t.status]}
                  </span>
                </td>
                <td>
                  {done}/{t.registration.length}
                </td>
                <td>{t._count.shipments}</td>
                <td>{fmtDate(t.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
