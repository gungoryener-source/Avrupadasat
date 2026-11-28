import Link from "next/link";
import { notFound } from "next/navigation";
import { forTenant } from "@avrupadasat/db";
import { ShipmentDetail } from "@/components/ShipmentDetail";
import { db } from "@/server/db";
import { missingDocs } from "@/server/documents";
import { requireClient } from "@/server/session";
import { UploadForm } from "../../forms";

export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireClient("shipment.read");
  const { id } = await params;
  const sh = await forTenant(db(), s.actor.tenantId).shipment.findFirst({
    where: { id },
    include: {
      events: { orderBy: { at: "asc" } },
      lines: { orderBy: { sku: "asc" } },
      documents: { where: { internal: false }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!sh) notFound();
  const miss = missingDocs(sh.documents.map((d) => d.kind));
  return (
    <>
      <p>
        <Link href="/panel/sevkiyatlar">← Sevkiyatlar</Link>
      </p>
      <h1>Sevkiyat {sh.reference}</h1>
      <ShipmentDetail s={sh} userId={s.userId} />
      <div className="card" style={{ marginTop: 18 }}>
        <h2 style={{ marginTop: 0, fontSize: 19 }}>Belge yükle</h2>
        <UploadForm shipmentId={sh.id} defaultKind={miss[0] ?? "DIGER"} />
      </div>
    </>
  );
}
