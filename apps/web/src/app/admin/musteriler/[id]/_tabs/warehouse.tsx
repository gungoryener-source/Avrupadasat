import Link from "next/link";
import { can } from "@avrupadasat/core/roles";
import { forTenant } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { Badge, Card, EmptyState, Stat } from "@/components/panel/ui";
import { Submit } from "@/components/Submit";
import { db } from "@/server/db";
import { STAGE_LABEL } from "@/server/labels";
import { palletsAction, stockCountAction } from "../../../ops-actions";
import type { TabCtx } from "./ctx";

export async function WarehouseTab({ tenantId, actor }: TabCtx) {
  const t = forTenant(db(), tenantId);
  const [tenant, stock, shipments] = await Promise.all([
    db().tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { palletsInUse: true } }),
    t.stockItem.findMany({ orderBy: { sku: "asc" }, take: 300 }),
    t.shipment.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const write = can(actor.role, "stock.write");
  const units = stock.reduce((a, s) => a + s.quantity, 0);
  const low = stock.filter((s) => s.lowStockAt != null && s.quantity - s.reserved <= s.lowStockAt);
  return (
    <>
      <div className="stats" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
        <Stat label="Kullanılan palet" value={tenant.palletsInUse} />
        <Stat label="Ürün (SKU)" value={stock.length} />
        <Stat label="Toplam adet" value={units} />
        <Stat label="Düşük stok" value={low.length} />
      </div>
      <div className="grid grid-main">
        <div className="grid" style={{ alignContent: "start" }}>
          <Card title="Stok" pad={stock.length > 0 ? false : true}>
            {stock.length === 0 ? (
              <EmptyState
                title="Stok yok"
                text="İlk sevkiyat depoya kabul edildiğinde stok oluşur."
              />
            ) : (
              <table className="tbl tbl-stack">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Ürün</th>
                    <th className="num">Mevcut</th>
                    <th className="num">Ayrılmış</th>
                    <th>Eşik</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((s) => (
                    <tr key={s.id}>
                      <td className="mono">{s.sku}</td>
                      <td data-l="Ürün">{s.name}</td>
                      <td data-l="Mevcut" className="num">
                        {s.quantity}
                      </td>
                      <td data-l="Ayrılmış" className="num">
                        {s.reserved}
                      </td>
                      <td data-l="Eşik">
                        {s.lowStockAt ?? "—"} {low.includes(s) && <Badge tone="amber">Düşük</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          <Card
            title="Son sevkiyatlar"
            action={<Link href={`/admin/sevkiyatlar?firma=${tenantId}`}>Tümü</Link>}
          >
            {shipments.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Sevkiyat yok.
              </p>
            ) : (
              <ul className="ls">
                {shipments.map((sh) => (
                  <li key={sh.id}>
                    <div className="ls-main">
                      <Link href={`/admin/sevkiyatlar/${sh.id}`}>{sh.reference}</Link>
                      <small>
                        {sh.pallets} palet · {fmtDate(sh.createdAt)}
                      </small>
                    </div>
                    <Badge tone={sh.stage === "DEPO_KABUL" ? "green" : "blue"}>
                      {STAGE_LABEL[sh.stage]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        {write && (
          <div className="grid" style={{ alignContent: "start" }}>
            <Card title="Depoda kullanılan palet">
              <form action={palletsAction} className="form row-actions">
                <input type="hidden" name="tenantId" value={tenantId} />
                <input
                  name="pallets"
                  type="number"
                  min={0}
                  defaultValue={tenant.palletsInUse}
                  style={{ width: 110 }}
                  aria-label="Kullanılan palet"
                />
                <Submit className="btn btn-o btn-sm">Kaydet</Submit>
              </form>
            </Card>
            <Card title="Stok sayımı">
              <form action={stockCountAction} className="form">
                <input type="hidden" name="tenantId" value={tenantId} />
                <div className="field">
                  <label htmlFor="csv">CSV (sku;miktar)</label>
                  <textarea
                    id="csv"
                    name="csv"
                    rows={4}
                    placeholder={"sku;miktar\nHV-1;120"}
                    aria-label="Sayım CSV"
                  />
                </div>
                <div>
                  <Submit className="btn btn-o btn-sm">Sayımı işle</Submit>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
