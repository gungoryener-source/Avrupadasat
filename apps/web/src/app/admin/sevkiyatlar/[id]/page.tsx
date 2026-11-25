import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { shipmentStages } from "@avrupadasat/core/events";
import { can, canAccessTenant } from "@avrupadasat/core/roles";
import { ShipmentDetail } from "@/components/ShipmentDetail";
import { Submit } from "@/components/Submit";
import { db } from "@/server/db";
import { STAGE_LABEL } from "@/server/labels";
import { requireStaff } from "@/server/session";
import { advanceStageAction, receiveAction } from "../../ops-actions";

export default async function AdminShipment({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff("shipment.read");
  const { id } = await params;
  const sh = await db().shipment.findUnique({
    where: { id },
    include: {
      tenant: true,
      events: { orderBy: { at: "asc" } },
      lines: { orderBy: { sku: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!sh) notFound();
  if (!canAccessTenant(s.actor, sh.tenantId)) redirect("/admin?hata=yetki");
  const write = can(s.actor.role, "shipment.write");
  return (
    <>
      <p>
        <Link href="/admin/sevkiyatlar">← Sevkiyatlar</Link>
      </p>
      <h1>
        {sh.tenant.name} · {sh.reference}
      </h1>
      <ShipmentDetail s={sh} userId={s.userId} />
      {write && !sh.receivedAt && (
        <div className="g2" style={{ marginTop: 18 }}>
          <form action={advanceStageAction} className="card form">
            <h2 style={{ margin: 0, fontSize: 19 }}>Aşamayı güncelle</h2>
            <input type="hidden" name="tenantId" value={sh.tenantId} />
            <input type="hidden" name="shipmentId" value={sh.id} />
            <div className="field">
              <label htmlFor="stage">Aşama</label>
              <select
                id="stage"
                name="stage"
                defaultValue={shipmentStages[Math.min(shipmentStages.indexOf(sh.stage) + 1, 3)]}
              >
                {shipmentStages
                  .filter((x) => x !== "DEPO_KABUL")
                  .map((x) => (
                    <option key={x} value={x}>
                      {STAGE_LABEL[x]}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="note">Not (müşteri görür)</label>
              <input id="note" name="note" maxLength={300} />
            </div>
            <Submit>Kaydet ve müşteriye bildir</Submit>
          </form>
          <form action={receiveAction} className="card form">
            <h2 style={{ margin: 0, fontSize: 19 }}>Mal kabul sayımı</h2>
            <input type="hidden" name="tenantId" value={sh.tenantId} />
            <input type="hidden" name="shipmentId" value={sh.id} />
            <table className="tbl">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Bildirilen</th>
                  <th>Sayılan</th>
                  <th>Hasarlı</th>
                </tr>
              </thead>
              <tbody>
                {sh.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="mono">{l.sku}</td>
                    <td>{l.quantity}</td>
                    <td>
                      <input
                        name={`r:${l.sku}`}
                        type="number"
                        min={0}
                        defaultValue={l.quantity}
                        style={{ width: 90 }}
                        aria-label={`${l.sku} sayılan`}
                      />
                    </td>
                    <td>
                      <input
                        name={`d:${l.sku}`}
                        type="number"
                        min={0}
                        defaultValue={0}
                        style={{ width: 70 }}
                        aria-label={`${l.sku} hasarlı`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Submit>Mal kabulü tamamla (stoğa işle)</Submit>
          </form>
        </div>
      )}
    </>
  );
}
