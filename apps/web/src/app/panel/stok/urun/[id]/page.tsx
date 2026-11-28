import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@avrupadasat/core/roles";
import { forTenant } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { ActionForm } from "@/components/panel/ActionForm";
import { LabelCard } from "@/components/panel/LabelCard";
import { MovementTable } from "@/components/panel/StockViews";
import { Badge, Card, PageHeader, pageNum } from "@/components/panel/ui";
import { Submit } from "@/components/Submit";
import { db } from "@/server/db";
import { STAGE_LABEL } from "@/server/labels";
import { requireClient } from "@/server/session";
import { incomingBySku, listMovements } from "@/server/stock";
import { lowStockAction, productImageAction } from "../../../portal-actions";

export const metadata = { title: "Ürün" };

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sayfa?: string }>;
}) {
  const s = await requireClient("stock.read");
  const { id } = await params;
  const t = forTenant(db(), s.actor.tenantId);
  // Kiracı kapsamlı sorgu: başka firmanın ürün kimliği burada bulunamaz
  const item = await t.stockItem.findFirst({ where: { id } });
  if (!item) notFound();
  const [mv, incoming, inbound] = await Promise.all([
    listMovements(s.actor.tenantId, {
      sku: item.sku,
      page: pageNum((await searchParams).sayfa),
      pageSize: 20,
    }),
    incomingBySku(s.actor.tenantId),
    t.asnLine.findMany({
      where: { sku: item.sku, receivedQty: null, shipment: { stage: { not: "DEPO_KABUL" } } },
      include: { shipment: { select: { id: true, reference: true, stage: true } } },
    }),
  ]);
  const write = can(s.actor.role, "catalog.write");
  const available = item.quantity - item.reserved;
  const low = item.lowStockAt != null && available <= item.lowStockAt;
  return (
    <>
      <PageHeader
        title={item.name}
        crumbs={[{ href: "/panel/stok", label: "Depo ve Stok" }]}
        desc={
          <>
            <span className="mono">{item.sku}</span> · Etiket{" "}
            <span className="mono">{item.labelCode}</span>
            {item.ean && <> · EAN {item.ean}</>}
            {item.location && <> · Raf {item.location}</>}
          </>
        }
        actions={low ? <Badge tone="amber">Düşük stok</Badge> : undefined}
      />
      <div className="grid grid-main">
        <div className="grid" style={{ alignContent: "start" }}>
          <div className="stats" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
            <div className="st">
              <div className="st-l">Depoda</div>
              <div className="st-v">{item.quantity}</div>
            </div>
            <div className="st">
              <div className="st-l">Yolda</div>
              <div className="st-v">{incoming.get(item.sku) ?? 0}</div>
            </div>
            <div className="st">
              <div className="st-l">Ayrılmış</div>
              <div className="st-v">{item.reserved}</div>
            </div>
            <div className="st">
              <div className="st-l">Kullanılabilir</div>
              <div className="st-v">{available}</div>
            </div>
          </div>
          {inbound.length > 0 && (
            <Card title="Yoldaki sevkiyatlar">
              <ul className="ls">
                {inbound.map((l) => (
                  <li key={l.id}>
                    <div className="ls-main">
                      <Link href={`/panel/sevkiyatlar/${l.shipment.id}`}>
                        {l.shipment.reference}
                      </Link>
                      <small>{l.quantity} adet</small>
                    </div>
                    <Badge tone="blue">{STAGE_LABEL[l.shipment.stage]}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <h2 style={{ fontSize: 17, margin: "8px 0 0" }}>Stok geçmişi</h2>
          <MovementTable data={mv} params={{}} showSku={false} />
        </div>
        <div className="grid" style={{ alignContent: "start" }}>
          <LabelCard id={item.id} code={item.labelCode} />
          <Card title="Ürün görseli">
            {item.imageKey ? (
              // eslint-disable-next-line @next/next/no-img-element -- yetkili rota
              <img className="prod-img" src={`/api/urun-gorsel/${item.id}`} alt={item.name} />
            ) : (
              <p className="muted" style={{ marginTop: 0 }}>
                Görsel yok. Depo ekibi mal kabulde ürünü bununla eşleştirir.
              </p>
            )}
            {write && (
              <ActionForm action={productImageAction} encType="multipart/form-data">
                <input type="hidden" name="id" value={item.id} />
                <div className="field">
                  <label htmlFor="image">PNG veya JPG, en çok 3 MB</label>
                  <input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/png,image/jpeg"
                    required
                  />
                </div>
                <div>
                  <Submit className="btn btn-o btn-sm" pendingText="Yükleniyor…">
                    {item.imageKey ? "Görseli değiştir" : "Görsel yükle"}
                  </Submit>
                </div>
              </ActionForm>
            )}
          </Card>
          {write && (
            <Card title="Düşük stok uyarısı">
              <form action={lowStockAction} className="form row-actions">
                <input type="hidden" name="sku" value={item.sku} />
                <input
                  name="lowStockAt"
                  type="number"
                  min={0}
                  defaultValue={item.lowStockAt ?? ""}
                  aria-label={`${item.sku} düşük stok eşiği`}
                  style={{ width: 100 }}
                />
                <Submit className="btn btn-o btn-sm">Kaydet</Submit>
              </form>
              <p className="muted" style={{ fontSize: 13, marginBottom: 0 }}>
                Kullanılabilir adet bu sayıya inince bildirim alırsınız. Boş bırakırsanız uyarı
                kapanır.
              </p>
            </Card>
          )}
          <Card title="Almanca ürün içeriği">
            <p style={{ marginTop: 0 }}>
              {item.contentApprovedAt ? (
                <Badge tone="green">Onaylı · {fmtDate(item.contentApprovedAt)}</Badge>
              ) : (
                <Badge tone="amber">Hazırlanmadı</Badge>
              )}
            </p>
            <Link href={`/panel/icerik/${encodeURIComponent(item.sku)}`}>İçeriği aç →</Link>
          </Card>
        </div>
      </div>
    </>
  );
}
