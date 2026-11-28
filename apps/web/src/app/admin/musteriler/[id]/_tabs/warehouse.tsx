import Link from "next/link";
import { can } from "@avrupadasat/core/roles";
import { forTenant } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { AdjustForm, LocationForm, StaffImageForm } from "@/components/panel/StockForms";
import { MovementTable, Thumb } from "@/components/panel/StockViews";
import { Badge, Card, EmptyState, Stat, Tabs, Toolbar, pageNum } from "@/components/panel/ui";
import { Submit } from "@/components/Submit";
import { db } from "@/server/db";
import { STAGE_LABEL } from "@/server/labels";
import { listMovements, listStock, MOVEMENT_LABEL } from "@/server/stock";
import { palletsAction, stockCountAction } from "../../../ops-actions";
import type { TabCtx } from "./ctx";

export async function WarehouseTab({ tenantId, actor, q }: TabCtx) {
  const t = forTenant(db(), tenantId);
  const view = q.gorunum === "hareket" ? "hareket" : "stok";
  const base = `/admin/musteriler/${tenantId}?sekme=depo`;
  const [tenant, stock, shipments, mv] = await Promise.all([
    db().tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { palletsInUse: true } }),
    listStock(tenantId, { q: q.q, pageSize: 300 }),
    t.shipment.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    view === "hareket"
      ? listMovements(tenantId, { reason: q.tur, sku: q.sku, page: pageNum(q.sayfa) })
      : null,
  ]);
  const write = can(actor.role, "stock.write");
  return (
    <>
      <div className="stats" style={{ gridTemplateColumns: "repeat(5, minmax(0,1fr))" }}>
        <Stat label="Kullanılan palet" value={tenant.palletsInUse} />
        <Stat label="Ürün (SKU)" value={stock.totals.skus} />
        <Stat label="Depoda" value={stock.totals.units} hint="adet" />
        <Stat label="Yolda" value={stock.totals.incoming} hint="adet" />
        <Stat label="Düşük stok" value={stock.totals.low} />
      </div>
      <Tabs
        active={view}
        items={[
          { key: "stok", label: "Ürünler", href: base },
          { key: "hareket", label: "Stok hareketleri", href: `${base}&gorunum=hareket` },
        ]}
      />
      {mv ? (
        <>
          <Toolbar
            search={false}
            keep={{ sekme: "depo", gorunum: "hareket", sku: q.sku }}
            filters={[
              {
                name: "tur",
                label: "Hareket",
                value: q.tur,
                options: Object.entries(MOVEMENT_LABEL).map(([value, label]) => ({
                  value,
                  label,
                })),
              },
            ]}
          />
          {q.sku && (
            <p style={{ fontSize: 14 }}>
              <b className="mono">{q.sku}</b> ·{" "}
              <Link href={`${base}&gorunum=hareket`}>Tüm ürünler</Link>
            </p>
          )}
          <MovementTable
            data={mv}
            params={{ sekme: "depo", gorunum: "hareket", tur: q.tur, sku: q.sku }}
          />
        </>
      ) : (
        <div className="grid grid-main">
          <div className="grid" style={{ alignContent: "start" }}>
            <Toolbar q={q.q} placeholder="SKU, ad veya raf" keep={{ sekme: "depo" }} />
            {stock.total === 0 ? (
              <Card>
                <EmptyState
                  title="Stok yok"
                  text="İlk sevkiyat depoya kabul edildiğinde stok oluşur."
                />
              </Card>
            ) : (
              <div className="tw">
                <table className="tbl tbl-stack">
                  <thead>
                    <tr>
                      <th>Ürün</th>
                      <th>Raf</th>
                      <th className="num">Depoda</th>
                      <th className="num">Yolda</th>
                      <th className="num">Ayrılmış</th>
                      <th className="num">Kull.</th>
                      {write && <th>İşlem</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {stock.items.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div className="prod">
                            <Thumb id={s.id} has={!!s.imageKey} name={s.name} />
                            <div>
                              <span className="mono">{s.sku}</span>
                              <div style={{ fontSize: 13 }}>{s.name}</div>
                            </div>
                          </div>
                        </td>
                        <td data-l="Raf">
                          {write ? (
                            <LocationForm tenantId={tenantId} sku={s.sku} location={s.location} />
                          ) : (
                            (s.location ?? "—")
                          )}
                        </td>
                        <td data-l="Depoda" className="num">
                          {s.quantity}
                        </td>
                        <td data-l="Yolda" className="num">
                          {s.incoming || "—"}
                        </td>
                        <td data-l="Ayrılmış" className="num">
                          {s.reserved}
                        </td>
                        <td data-l="Kullanılabilir" className="num">
                          <b>{s.available}</b> {s.low && <Badge tone="amber">Düşük</Badge>}
                        </td>
                        {write && (
                          <td data-l="İşlem" style={{ minWidth: 200 }}>
                            <details className="drawer">
                              <summary>Düzelt / görsel</summary>
                              <AdjustForm tenantId={tenantId} sku={s.sku} />
                              <div style={{ height: 12 }} />
                              <StaffImageForm tenantId={tenantId} sku={s.sku} />
                            </details>
                            <Link
                              href={`${base}&gorunum=hareket&sku=${encodeURIComponent(s.sku)}`}
                              style={{ fontSize: 13 }}
                            >
                              Geçmiş
                            </Link>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
              <Card title="Toplu stok sayımı">
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
                  <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                    Sayılan miktar yazılır; fark hareket geçmişine “Sayım / düzeltme” olarak düşer.
                  </p>
                  <div>
                    <Submit className="btn btn-o btn-sm">Sayımı işle</Submit>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      )}
    </>
  );
}
