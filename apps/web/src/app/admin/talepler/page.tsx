import Link from "next/link";
import type { LeadStatus } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { db } from "@/server/db";
import { LEAD_STATUS_LABEL } from "@/server/leads";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Talepler" };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  await requireStaff("lead.read");
  const { durum } = await searchParams;
  const status = durum && durum in LEAD_STATUS_LABEL ? (durum as LeadStatus) : undefined;
  const leads = await db().lead.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <h1>Uygunluk raporu talepleri</h1>
      <p className="row" style={{ fontSize: 14 }}>
        <Link href="/admin/talepler">Tümü</Link>
        {Object.entries(LEAD_STATUS_LABEL).map(([k, v]) => (
          <Link
            key={k}
            href={`/admin/talepler?durum=${k}`}
            style={{ fontWeight: k === status ? 800 : 400 }}
          >
            {v}
          </Link>
        ))}
      </p>
      <table className="tbl">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Firma</th>
            <th>Kategori</th>
            <th>Kaynak</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => {
            const a = l.attribution as { utmSource?: string; gclid?: string };
            return (
              <tr key={l.id}>
                <td>{fmtDate(l.createdAt, true)}</td>
                <td>
                  <Link href={`/admin/talepler/${l.id}`}>{l.companyName}</Link>
                </td>
                <td>{l.category}</td>
                <td>{a.gclid ? "Google Ads" : (a.utmSource ?? "Doğrudan")}</td>
                <td>
                  <span
                    className={`tag ${l.status === "WON" ? "ok" : l.status === "LOST" ? "red" : ""}`}
                  >
                    {LEAD_STATUS_LABEL[l.status]}
                  </span>
                </td>
              </tr>
            );
          })}
          {leads.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                Kayıt yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
