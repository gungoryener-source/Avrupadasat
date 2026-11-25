import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canAccessTenant } from "@avrupadasat/core/roles";
import { fmtDate } from "@/components/AppShell";
import { Submit } from "@/components/Submit";
import { db } from "@/server/db";
import { CHANNEL_LABEL, ORDER_STATUS, RETURN_CONDITION } from "@/server/labels-ops";
import {
  cancelOrder,
  processReturn,
  registerReturn,
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
  await shipOrder(i.tenantId, i.orderId, i.carrier, i.trackingNo.trim(), s.userId);
  revalidatePath("/admin/siparisler");
}

async function retryAction(fd: FormData) {
  "use server";
  const i = z.object({ tenantId: z.string(), orderId: z.string() }).parse(Object.fromEntries(fd));
  await guard(i.tenantId);
  await retryHeld(i.tenantId, i.orderId);
  revalidatePath("/admin/siparisler");
}

async function cancelAction(fd: FormData) {
  "use server";
  const i = z.object({ tenantId: z.string(), orderId: z.string() }).parse(Object.fromEntries(fd));
  const s = await guard(i.tenantId);
  await cancelOrder(i.tenantId, i.orderId, s.userId);
  revalidatePath("/admin/siparisler");
}

async function returnAction(fd: FormData) {
  "use server";
  const i = z
    .object({
      tenantId: z.string(),
      orderId: z.string().optional(),
      sku: z.string().min(1),
      quantity: z.coerce.number().int(),
      reason: z.string().max(200).optional(),
    })
    .parse(Object.fromEntries(fd));
  const s = await guard(i.tenantId);
  await registerReturn(
    i.tenantId,
    { orderId: i.orderId || undefined, sku: i.sku, quantity: i.quantity, reason: i.reason },
    s.userId,
  );
  revalidatePath("/admin/siparisler");
}

async function processAction(fd: FormData) {
  "use server";
  const i = z
    .object({
      tenantId: z.string(),
      returnId: z.string(),
      condition: z.enum(["SELLABLE", "REPACK", "DAMAGED"]),
    })
    .parse(Object.fromEntries(fd));
  const s = await guard(i.tenantId);
  await processReturn(i.tenantId, i.returnId, i.condition, s.userId);
  revalidatePath("/admin/siparisler");
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
  searchParams: Promise<{ firma?: string }>;
}) {
  const s = await requireStaff("order.read");
  const { firma } = await searchParams;
  const scope =
    s.actor.role === "PARTNER"
      ? { tenantId: { in: [...(s.actor.partnerTenantIds ?? [])] } }
      : firma
        ? { tenantId: firma }
        : {};
  const [queue, returns] = await Promise.all([
    db().order.findMany({
      where: { ...scope, status: { in: ["ALLOCATED", "ON_HOLD"] } },
      include: { lines: true, tenant: { select: { name: true } } },
      orderBy: { orderedAt: "asc" },
      take: 200,
    }),
    db().returnItem.findMany({
      where: { ...scope, status: "RECEIVED" },
      include: { order: { select: { externalId: true } } },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
  ]);
  const tenants = await db().tenant.findMany({
    where: s.actor.role === "PARTNER" ? { id: { in: [...(s.actor.partnerTenantIds ?? [])] } } : {},
    select: { id: true, name: true },
  });
  return (
    <>
      <h1>Sipariş kuyruğu</h1>
      <form action={syncAllAction} style={{ marginBottom: 14 }}>
        <Submit className="btn btn-o btn-sm" pendingText="Çekiliyor…">
          Tüm bağlı kanallardan siparişleri çek
        </Submit>
      </form>
      <table className="tbl" style={{ marginBottom: 24 }}>
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
                  {o.status === "ALLOCATED" ? (
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
                        style={{ width: 170 }}
                      />
                      <Submit className="btn btn-sm" pendingText="…">
                        Kargolandı
                      </Submit>
                    </form>
                  ) : (
                    <form action={retryAction}>
                      <input type="hidden" name="tenantId" value={o.tenantId} />
                      <input type="hidden" name="orderId" value={o.id} />
                      <Submit className="btn btn-o btn-sm" pendingText="…">
                        Stoğu yeniden dene
                      </Submit>
                    </form>
                  )}
                  <form action={cancelAction} style={{ marginTop: 6 }}>
                    <input type="hidden" name="tenantId" value={o.tenantId} />
                    <input type="hidden" name="orderId" value={o.id} />
                    <button className="btn btn-o btn-sm" type="submit">
                      İptal
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
          {queue.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                Kuyrukta sipariş yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="g2">
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 19 }}>İade kaydı</h2>
          <form action={returnAction} className="form">
            <div className="field">
              <label htmlFor="r-tenant">Firma</label>
              <select id="r-tenant" name="tenantId" required>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="inline-form">
              <div className="field">
                <label htmlFor="r-sku">SKU</label>
                <input id="r-sku" name="sku" required />
              </div>
              <div className="field">
                <label htmlFor="r-qty">Adet</label>
                <input
                  id="r-qty"
                  name="quantity"
                  type="number"
                  min={1}
                  defaultValue={1}
                  style={{ width: 80 }}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="r-reason">Neden</label>
              <input id="r-reason" name="reason" maxLength={200} />
            </div>
            <Submit>İadeyi kaydet</Submit>
          </form>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 19 }}>Kontrol bekleyen iadeler</h2>
          {returns.length === 0 && <p className="muted">Bekleyen iade yok.</p>}
          {returns.map((r) => (
            <form
              key={r.id}
              action={processAction}
              className="inline-form"
              style={{ marginBottom: 10 }}
            >
              <input type="hidden" name="tenantId" value={r.tenantId} />
              <input type="hidden" name="returnId" value={r.id} />
              <span className="mono" style={{ fontSize: 13 }}>
                {r.quantity}× {r.sku} {r.order ? `(${r.order.externalId})` : ""}
              </span>
              <select name="condition" defaultValue="SELLABLE" aria-label={`${r.sku} durum`}>
                {Object.entries(RETURN_CONDITION).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <Submit className="btn btn-o btn-sm" pendingText="…">
                İşle
              </Submit>
            </form>
          ))}
        </div>
      </div>
    </>
  );
}
