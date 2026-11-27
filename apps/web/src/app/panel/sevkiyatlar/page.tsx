import Link from "next/link";
import { forTenant } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { PageHeader, Tabs } from "@/components/panel/ui";
import { db } from "@/server/db";
import { missingDocs } from "@/server/documents";
import { STAGE_LABEL } from "@/server/labels";
import { requireClient } from "@/server/session";
import { AsnForm } from "../forms";

export const metadata = { title: "Sevkiyatlar" };

export default async function ShipmentsPage() {
  const s = await requireClient("shipment.read");
  const rows = await forTenant(db(), s.actor.tenantId).shipment.findMany({
    orderBy: { createdAt: "desc" },
    include: { documents: { select: { kind: true } }, _count: { select: { lines: true } } },
    take: 200,
  });
  return (
    <>
      <PageHeader
        title="Depo ve Stok"
        desc="Almanya deposundaki ürünleriniz, sevkiyatlar ve stok hareketleri."
      />
      <Tabs
        active="sevkiyat"
        items={[
          { key: "stok", label: "Stok", href: "/panel/stok" },
          { key: "sevkiyat", label: "Sevkiyatlar", href: "/panel/sevkiyatlar" },
        ]}
      />
      <table className="tbl" style={{ marginBottom: 22 }}>
        <thead>
          <tr>
            <th>Referans</th>
            <th>Aşama</th>
            <th>Palet / koli</th>
            <th>Ürün çeşidi</th>
            <th>Belgeler</th>
            <th>Bildirim</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const miss = missingDocs(r.documents.map((d) => d.kind));
            return (
              <tr key={r.id}>
                <td>
                  <Link href={`/panel/sevkiyatlar/${r.id}`}>{r.reference}</Link>
                </td>
                <td>
                  <span className={`tag ${r.stage === "DEPO_KABUL" ? "ok" : "warn"}`}>
                    {STAGE_LABEL[r.stage]}
                  </span>
                </td>
                <td>
                  {r.pallets} / {r.cartons}
                </td>
                <td>{r._count.lines}</td>
                <td>
                  {miss.length ? (
                    <span className="tag red">{miss.length} eksik</span>
                  ) : (
                    <span className="tag ok">Tamam</span>
                  )}
                </td>
                <td>{fmtDate(r.createdAt)}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                Henüz sevkiyat yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <AsnForm />
    </>
  );
}
