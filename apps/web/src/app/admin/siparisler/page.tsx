import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canAccessTenant } from "@avrupadasat/core/roles";
import { fmtDate } from "@/components/AppShell";
import { EmptyState, Flash, PageHeader, Tabs } from "@/components/panel/ui";
import { Submit } from "@/components/Submit";
import { db } from "@/server/db";
import { CHANNEL_LABEL, ORDER_STATUS } from "@/server/labels-ops";
import {
  cancelOrder,
  markDelivered,
  packOrder,
  retryHeld,
  shipOrder,
  shipTo,
  syncOrders,
} from "@/server/orders";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Siparişler ve iadeler" };

async function guard(tenantId: string) {
  const s = await requireStaff("order.write");
  if (!canAccessTenant(s.actor, tenantId)) redirect("/admin?hata=yetki");
  return s;
}

async function shipAction(fd: FormData) {
  "use server";
  const i = z
    .object({
      tenantId: z.string(),
      orderId: z.string(),
      carrier: z.string().min(2).max(20),
      trackingNo: z.string(),
    })
    .parse(Object.fromEntries(fd));
  const s = await guard(i.tenantId);
  const r = await shipOrder(i.tenantId, i.orderId, i.carrier, i.trackingNo.trim(), s.userId);
  done(r, "kargo");
}

/** Sonucu sayfa üstünde göstermek için yönlendirir (satır kuyruktan çıkabilir) */
function done(r: { ok: boolean; reason?: string }, ok: string, view = ""): never {
  revalidatePath("/admin/siparisler");
  const v = view ? `gorunum=${view}&` : "";
  redirect(
    r.ok
      ? `/admin/siparisler?${v}sonuc=${ok}`
      : `/admin/siparisler?${v}hata=${encodeURIComponent(r.reason ?? "İşlem yapılamadı")}`,
  );
}

async function packAction(fd: FormData) {
  "use server";
  const i = z
    .object({ tenantId: z.string(), orderId: z.string(), cartons: z.coerce.number().int() })
    .parse(Object.fromEntries(fd));
  const s = await guard(i.tenantId);
  done(await packOrder(i.tenantId, i.orderId, i.cartons, s.userId), "paket");
}

async function deliveredAction(fd: FormData) {
  "use server";
  const i = z.object({ tenantId: z.string(), orderId: z.string() }).parse(Object.fromEntries(fd));
  const s = await guard(i.tenantId);
  done(await markDelivered(i.tenantId, i.orderId, s.userId), "teslim", "kargoda");
}

async function retryAction(fd: FormData) {
  "use server";
  const i = z.object({ tenantId: z.string(), orderId: z.string() }).parse(Object.fromEntries(fd));
  await guard(i.tenantId);
  done(await retryHeld(i.tenantId, i.orderId), "tekrar");
}

async function cancelAction(fd: FormData) {
  "use server";
  const i = z.object({ tenantId: z.string(), orderId: z.string() }).parse(Object.fromEntries(fd));
  const s = await guard(i.tenantId);
  done(await cancelOrder(i.tenantId, i.orderId, s.userId), "iptal");
}

async function syncAllAction() {
  "use server";
  const s = await requireStaff("order.write");
  const conns = await db().marketplaceConnection.findMany({ where: { status: "ACTIVE" } });
  for (const c of conns)
    if (canAccessTenant(s.actor, c.tenantId)) await syncOrders(c.tenantId, c.channel);
  revalidatePath("/admin/siparisler");
}

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ firma?: string; gorunum?: string; sonuc?: string; hata?: string }>;
}) {
  const s = await requireStaff("order.read");
  const { firma, gorunum, sonuc, hata } = await searchParams;
  const shippedView = gorunum === "kargoda";
  const scope =
    s.actor.role === "PARTNER"
      ? { tenantId: { in: [...(s.actor.partnerTenantIds ?? [])] } }
      : firma
        ? { tenantId: firma }
        : {};
  const queue = await db().order.findMany({
    where: {
      ...scope,
      status: { in: shippedView ? ["SHIPPED"] : ["ALLOCATED", "PACKED", "ON_HOLD"] },
    },
    include: { lines: true, tenant: { select: { name: true } } },
    orderBy: { orderedAt: "asc" },
    take: 200,
  });
  return (
    <>
      <PageHeader
        title="Siparişler"
        desc="Hazırlanan → Paketlendi → Kargoda → Teslim edildi. Kargolandığında takip numarası pazaryerine iletilir."
      />
      <Tabs
        active={shippedView ? "shipped" : "orders"}
        items={[
          { key: "orders", label: "Hazırlık kuyruğu", href: "/admin/siparisler" },
          { key: "shipped", label: "Kargoda", href: "/admin/siparisler?gorunum=kargoda" },
          { key: "returns", label: "İadeler", href: "/admin/iadeler" },
        ]}
      />
      <Flash
        value={sonuc}
        messages={{
          kargo: "Sipariş kargolandı; stok düştü.",
          paket: "Sipariş paketlendi.",
          teslim: "Teslim edildi olarak işaretlendi.",
          tekrar: "Stok ayrıldı; sipariş hazırlığa alındı.",
          iptal: "Sipariş iptal edildi; ayrılan stok serbest bırakıldı.",
        }}
      />
      {hata && (
        <p className="alert-err" role="alert" style={{ marginBottom: 16 }}>
          {hata.slice(0, 200)}
        </p>
      )}
      <form action={syncAllAction} style={{ marginBottom: 14 }}>
        <Submit className="btn btn-o btn-sm" pendingText="Çekiliyor…">
          Tüm bağlı kanallardan siparişleri çek
        </Submit>
      </form>
      <div className="tw">
        <table className="tbl tbl-stack">
          <thead>
            <tr>
              <th>Sipariş</th>
              <th>Firma</th>
              <th>Teslimat</th>
              <th>Ürünler</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((o) => {
              const to = shipTo(o.shipToEnc);
              return (
                <tr key={o.id}>
                  <td>
                    {CHANNEL_LABEL[o.channel]}
                    <div className="mono" style={{ fontSize: 12 }}>
                      {o.externalId}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {fmtDate(o.orderedAt, true)}
                    </div>
                  </td>
                  <td>{o.tenant.name}</td>
                  <td style={{ fontSize: 13 }}>
                    {to.name}
                    <br />
                    {to.street}, {to.zip} {to.city}
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {o.lines.map((l) => `${l.quantity}× ${l.sku}`).join(", ")}
                  </td>
                  <td>
                    <span className={`tag ${ORDER_STATUS[o.status][1]}`}>
                      {ORDER_STATUS[o.status][0]}
                    </span>
                  </td>
                  <td>
                    {o.status === "SHIPPED" ? (
                      <>
                        <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                          {o.carrier} {o.trackingNo}
                        </div>
                        <form action={deliveredAction}>
                          <input type="hidden" name="tenantId" value={o.tenantId} />
                          <input type="hidden" name="orderId" value={o.id} />
                          <Submit className="btn btn-o btn-sm" pendingText="…">
                            Teslim edildi
                          </Submit>
                        </form>
                      </>
                    ) : o.status === "ON_HOLD" ? (
                      <form action={retryAction}>
                        <input type="hidden" name="tenantId" value={o.tenantId} />
                        <input type="hidden" name="orderId" value={o.id} />
                        <Submit className="btn btn-o btn-sm" pendingText="…">
                          Stoğu yeniden dene
                        </Submit>
                      </form>
                    ) : (
                      <div className="grid" style={{ gap: 6 }}>
                        {o.status === "ALLOCATED" && (
                          <form action={packAction} className="inline-form">
                            <input type="hidden" name="tenantId" value={o.tenantId} />
                            <input type="hidden" name="orderId" value={o.id} />
                            <input
                              name="cartons"
                              type="number"
                              min={1}
                              defaultValue={1}
                              aria-label={`${o.externalId} koli sayısı`}
                              style={{ width: 70 }}
                            />
                            <Submit className="btn btn-o btn-sm" pendingText="…">
                              Paketlendi
                            </Submit>
                          </form>
                        )}
                        <form action={shipAction} className="inline-form">
                          <input type="hidden" name="tenantId" value={o.tenantId} />
                          <input type="hidden" name="orderId" value={o.id} />
                          <select name="carrier" defaultValue="DHL" aria-label="Taşıyıcı">
                            <option>DHL</option>
                            <option>DPD</option>
                            <option>Hermes</option>
                            <option>GLS</option>
                          </select>
                          <input
                            name="trackingNo"
                            placeholder="Takip no"
                            required
                            aria-label={`${o.externalId} takip no`}
                            style={{ width: 150 }}
                          />
                          <Submit className="btn btn-sm" pendingText="…">
                            Kargolandı
                          </Submit>
                        </form>
                      </div>
                    )}
                    {o.status !== "SHIPPED" && (
                      <form action={cancelAction} style={{ marginTop: 6 }}>
                        <input type="hidden" name="tenantId" value={o.tenantId} />
                        <input type="hidden" name="orderId" value={o.id} />
                        <button className="btn btn-o btn-sm" type="submit">
                          İptal
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {queue.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    title={shippedView ? "Kargoda sipariş yok" : "Kuyrukta sipariş yok"}
                    text="Pazaryerlerinden yeni sipariş geldiğinde burada görünür."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
