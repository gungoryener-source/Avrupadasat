import { revalidatePath } from "next/cache";
import { can } from "@avrupadasat/core/roles";
import { forTenant } from "@avrupadasat/db";
import { formatEur } from "@avrupadasat/core/pricing";
import { fmtDate } from "@/components/AppShell";
import { Submit } from "@/components/Submit";
import { db } from "@/server/db";
import { CHANNEL_LABEL, ORDER_STATUS, RETURN_CONDITION } from "@/server/labels-ops";
import { connectChannel, shipTo, syncOrders } from "@/server/orders";
import { registrationState } from "@/server/panel";
import { requireClient } from "@/server/session";

export const metadata = { title: "Siparişler ve iadeler" };

async function connectAction(fd: FormData) {
  "use server";
  const s = await requireClient("user.manage");
  const ch = String(fd.get("channel"));
  if (ch !== "AMAZON" && ch !== "EBAY") return;
  await connectChannel(s.actor.tenantId, ch, s.userId);
  revalidatePath("/panel/siparisler");
}

async function syncAction(fd: FormData) {
  "use server";
  const s = await requireClient("order.read");
  const ch = String(fd.get("channel"));
  if (ch !== "AMAZON" && ch !== "EBAY") return;
  await syncOrders(s.actor.tenantId, ch);
  revalidatePath("/panel/siparisler");
}

export default async function OrdersPage() {
  const s = await requireClient("order.read");
  const t = forTenant(db(), s.actor.tenantId);
  const [orders, returns, conns, reg] = await Promise.all([
    t.order.findMany({ orderBy: { orderedAt: "desc" }, include: { lines: true }, take: 200 }),
    t.returnItem.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    t.marketplaceConnection.findMany(),
    registrationState(s.actor.tenantId),
  ]);
  const owner = can(s.actor.role, "user.manage");
  return (
    <>
      <h1>Siparişler ve iadeler</h1>
      <div className="card" style={{ marginBottom: 18 }}>
        <h2 style={{ marginTop: 0, fontSize: 19 }}>Satış kanalları</h2>
        {reg.salesLocked ? (
          <p className="note">
            Satış kanalları vergi numaraları tamamlanınca bağlanabilir. Bu arada ürün kartlarınızı
            ve ilk sevkiyatınızı hazırlayabilirsiniz.
          </p>
        ) : (
          <div className="row">
            {(["AMAZON", "EBAY"] as const).map((ch) => {
              const c = conns.find((x) => x.channel === ch);
              return (
                <div key={ch} className="card" style={{ padding: 14, minWidth: 240 }}>
                  <b>{CHANNEL_LABEL[ch]}</b>{" "}
                  {c ? (
                    <span className="tag ok">Bağlı{c.mode === "mock" ? " (demo)" : ""}</span>
                  ) : (
                    <span className="tag">Bağlı değil</span>
                  )}
                  <div className="muted" style={{ fontSize: 12, margin: "6px 0" }}>
                    {c?.lastSyncAt ? `Son senkron: ${fmtDate(c.lastSyncAt, true)}` : ""}
                  </div>
                  {c ? (
                    <form action={syncAction}>
                      <input type="hidden" name="channel" value={ch} />
                      <Submit className="btn btn-o btn-sm" pendingText="…">
                        Siparişleri şimdi çek
                      </Submit>
                    </form>
                  ) : owner ? (
                    <form action={connectAction}>
                      <input type="hidden" name="channel" value={ch} />
                      <Submit className="btn btn-sm" pendingText="…">
                        Bağla
                      </Submit>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <table className="tbl" style={{ marginBottom: 22 }}>
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Kanal / No</th>
            <th>Alıcı</th>
            <th>Ürünler</th>
            <th>Tutar</th>
            <th>Durum</th>
            <th>Takip</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const to = shipTo(o.shipToEnc);
            return (
              <tr key={o.id}>
                <td>{fmtDate(o.orderedAt, true)}</td>
                <td>
                  {CHANNEL_LABEL[o.channel]}
                  <div className="mono" style={{ fontSize: 12 }}>
                    {o.externalId}
                  </div>
                </td>
                <td>
                  {to.name}
                  <div className="muted" style={{ fontSize: 12 }}>
                    {to.zip} {to.city}
                  </div>
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {o.lines.map((l) => `${l.quantity}× ${l.sku}`).join(", ")}
                </td>
                <td>{formatEur(o.itemsCents, { decimals: true })}</td>
                <td>
                  <span className={`tag ${ORDER_STATUS[o.status][1]}`}>
                    {ORDER_STATUS[o.status][0]}
                  </span>
                  {o.holdReason && (
                    <div className="muted" style={{ fontSize: 12 }}>
                      {o.holdReason}
                    </div>
                  )}
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {o.trackingNo ? `${o.carrier} ${o.trackingNo}` : "—"}
                </td>
              </tr>
            );
          })}
          {orders.length === 0 && (
            <tr>
              <td colSpan={7} className="muted">
                Henüz sipariş yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <h2 style={{ fontSize: 19 }}>İadeler</h2>
      <table className="tbl">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>SKU</th>
            <th>Adet</th>
            <th>Neden</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          {returns.map((r) => (
            <tr key={r.id}>
              <td>{fmtDate(r.createdAt)}</td>
              <td className="mono">{r.sku}</td>
              <td>{r.quantity}</td>
              <td>{r.reason ?? "—"}</td>
              <td>
                {r.condition ? (
                  <span className={`tag ${r.condition === "DAMAGED" ? "red" : "ok"}`}>
                    {RETURN_CONDITION[r.condition]}
                  </span>
                ) : (
                  <span className="tag warn">Kontrol bekliyor</span>
                )}
              </td>
            </tr>
          ))}
          {returns.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                İade yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
