import Link from "next/link";
import { forTenant } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { db } from "@/server/db";
import { DOC_KIND_LABEL } from "@/server/documents";
import { signDownload } from "@/server/files";
import { requireClient } from "@/server/session";
import { UploadForm } from "../forms";

export const metadata = { title: "Belgeler" };

export default async function DocsPage() {
  const s = await requireClient("shipment.read");
  const docs = await forTenant(db(), s.actor.tenantId).document.findMany({
    orderBy: { createdAt: "desc" },
    include: { shipment: { select: { id: true, reference: true } } },
    take: 300,
  });
  return (
    <>
      <h1>Belgeler</h1>
      <div className="card" style={{ marginBottom: 18 }}>
        <UploadForm defaultKind="CE_BEYAN" />
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Tür</th>
            <th>Dosya</th>
            <th>Sevkiyat</th>
            <th>Tarama</th>
            <th>Tarih</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <td>{DOC_KIND_LABEL[d.kind]}</td>
              <td>
                <a href={signDownload(d.id, s.userId)}>{d.filename}</a>
              </td>
              <td>
                {d.shipment ? (
                  <Link href={`/panel/sevkiyatlar/${d.shipment.id}`}>{d.shipment.reference}</Link>
                ) : (
                  "—"
                )}
              </td>
              <td>
                <span
                  className={`tag ${d.scanStatus === "clean" ? "ok" : d.scanStatus === "skipped" ? "" : "warn"}`}
                >
                  {{ clean: "Temiz", skipped: "Taranmadı", pending: "Bekliyor", error: "Hata" }[
                    d.scanStatus
                  ] ?? d.scanStatus}
                </span>
              </td>
              <td>{fmtDate(d.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
