import Link from "next/link";
import { fmtDate } from "@/components/AppShell";
import { db } from "@/server/db";
import { STAGE_LABEL } from "@/server/labels";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Sevkiyatlar" };

export default async function AdminShipments({
  searchParams,
}: {
  searchParams: Promise<{ firma?: string; asama?: string }>;
}) {
  const s = await requireStaff("shipment.read");
  const { firma, asama } = await searchParams;
  const partnerScope =
    s.actor.role === "PARTNER" ? { tenantId: { in: [...(s.actor.partnerTenantIds ?? [])] } } : {};
  const rows = await db().shipment.findMany({
    where: {
      ...partnerScope,
      ...(firma ? { tenantId: firma } : {}),
      ...(asama && asama in STAGE_LABEL
        ? { stage: asama as keyof typeof STAGE_LABEL }
        : { stage: { not: "DEPO_KABUL" } }),
    },
    include: {
      tenant: { select: { name: true } },
      _count: { select: { documents: true, lines: true } },
    },
    orderBy: [{ expectedAt: "asc" }, { createdAt: "desc" }],
    take: 300,
  });
  return (
    <>
      <h1>Sevkiyatlar</h1>
      <p className="row" style={{ fontSize: 14 }}>
        <Link href="/admin/sevkiyatlar">Yoldakiler</Link>
        {Object.entries(STAGE_LABEL).map(([k, v]) => (
          <Link
            key={k}
            href={`/admin/sevkiyatlar?asama=${k}`}
            style={{ fontWeight: asama === k ? 800 : 400 }}
          >
            {v}
          </Link>
        ))}
      </p>
      <table className="tbl">
        <thead>
          <tr>
            <th>Firma</th>
            <th>Referans</th>
            <th>Aşama</th>
            <th>Palet</th>
            <th>Satır</th>
            <th>Belge</th>
            <th>Tahmini varış</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.tenant.name}</td>
              <td>
                <Link href={`/admin/sevkiyatlar/${r.id}`}>{r.reference}</Link>
              </td>
              <td>
                <span className="tag">{STAGE_LABEL[r.stage]}</span>
              </td>
              <td>{r.pallets}</td>
              <td>{r._count.lines}</td>
              <td>{r._count.documents}</td>
              <td>{fmtDate(r.expectedAt)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">
                Kayıt yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
