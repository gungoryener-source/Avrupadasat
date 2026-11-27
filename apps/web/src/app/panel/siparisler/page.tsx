import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can } from "@avrupadasat/core/roles";
import { forTenant } from "@avrupadasat/db";
import { formatEur } from "@avrupadasat/core/pricing";
import type { OrderStatus, Prisma, SalesChannel } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import {
  EmptyState,
  PageHeader,
  Pager,
  SortTh,
  Tabs,
  Toolbar,
  pageNum,
  sp,
} from "@/components/panel/ui";
import { Submit } from "@/components/Submit";
import { db } from "@/server/db";
import { CHANNEL_LABEL, ORDER_STATUS } from "@/server/labels-ops";
import {
  connectChannel,
  connectLive,
  LIVE_CONNECT_ERRORS,
  shipTo,
  syncOrders,
  type LiveCredentialInput,
} from "@/server/orders";
import { registrationState } from "@/server/panel";
import { requireClient } from "@/server/session";

export const metadata = { title: "Siparişler ve iadeler" };

const CHANNELS = ["AMAZON", "EBAY", "WEBSHOP"] as const;
type Ch = (typeof CHANNELS)[number];
const isCh = (v: string): v is Ch => (CHANNELS as readonly string[]).includes(v);
const live = () => process.env.INTEGRATIONS_MODE === "live";

const LIVE_FIELDS: Record<
  Ch,
  { name: string; label: string; secret?: boolean; optional?: boolean }[]
> = {
  AMAZON: [
    { name: "sellerId", label: "Seller ID" },
    { name: "refreshToken", label: "Refresh token (Atzr|…)", secret: true },
  ],
  EBAY: [{ name: "refreshToken", label: "Refresh token (v^1.1#…)", secret: true }],
  WEBSHOP: [
    { name: "shop", label: "Mağaza (ornek.myshopify.com)" },
    { name: "accessToken", label: "Admin API erişim anahtarı (shpat_…)", secret: true },
    { name: "locationId", label: "Depo konumu (gid://shopify/Location/…)" },
    {
      name: "webhookSecret",
      label: "Webhook gizli anahtarı (isteğe bağlı)",
      secret: true,
      optional: true,
    },
  ],
};

async function connectLiveAction(fd: FormData) {
  "use server";
  const s = await requireClient("user.manage");
  const ch = String(fd.get("channel"));
  if (!isCh(ch)) return;
  const v = (k: string) => String(fd.get(k) ?? "").trim();
  const input: LiveCredentialInput =
    ch === "AMAZON"
      ? { channel: ch, refreshToken: v("refreshToken"), sellerId: v("sellerId") }
      : ch === "EBAY"
        ? { channel: ch, refreshToken: v("refreshToken") }
        : {
            channel: ch,
            shop: v("shop"),
            accessToken: v("accessToken"),
            locationId: v("locationId"),
            webhookSecret: v("webhookSecret") || undefined,
          };
  const r = await connectLive(s.actor.tenantId, input, s.userId);
  revalidatePath("/panel/siparisler");
  if (!r.ok) redirect(`/panel/siparisler?hata=${encodeURIComponent(r.reason)}#kanal-${ch}`);
  redirect("/panel/siparisler");
}

async function connectAction(fd: FormData) {
  "use server";
  const s = await requireClient("user.manage");
  const ch = String(fd.get("channel"));
  if (!isCh(ch)) return;
  await connectChannel(s.actor.tenantId, ch, s.userId);
  revalidatePath("/panel/siparisler");
}

async function syncAction(fd: FormData) {
  "use server";
  const s = await requireClient("order.read");
  const ch = String(fd.get("channel"));
  if (!isCh(ch)) return;
  await syncOrders(s.actor.tenantId, ch);
  revalidatePath("/panel/siparisler");
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = sp(await searchParams);
  const raw = q.hata;
  const hata = raw && LIVE_CONNECT_ERRORS.has(raw) ? raw : null;
  const s = await requireClient("order.read");
  const t = forTenant(db(), s.actor.tenantId);
  const page = pageNum(q.sayfa);
  const size = 25;
  const status = q.durum && q.durum in ORDER_STATUS ? (q.durum as OrderStatus) : undefined;
  const channel = q.kanal && q.kanal in CHANNEL_LABEL ? (q.kanal as SalesChannel) : undefined;
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(channel ? { channel } : {}),
    ...(q.q
      ? {
          OR: [
            { externalId: { contains: q.q, mode: "insensitive" } },
            { trackingNo: { contains: q.q, mode: "insensitive" } },
            { lines: { some: { sku: { contains: q.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const SORTS: Record<string, Prisma.OrderOrderByWithRelationInput> = {
    tarih: { orderedAt: "asc" },
    "-tarih": { orderedAt: "desc" },
    tutar: { itemsCents: "asc" },
    "-tutar": { itemsCents: "desc" },
  };
  const orderBy = SORTS[q.sirala ?? ""] ?? { orderedAt: "desc" };
  const [orders, total, conns, reg] = await Promise.all([
    t.order.findMany({
      where,
      orderBy,
      include: { lines: true },
      take: size,
      skip: (page - 1) * size,
    }),
    t.order.count({ where }),
    t.marketplaceConnection.findMany(),
    registrationState(s.actor.tenantId),
  ]);
  const params = { q: q.q, durum: q.durum, kanal: q.kanal, sirala: q.sirala };
  const owner = can(s.actor.role, "user.manage");
  return (
    <>
      <PageHeader
        title="Siparişler"
        desc="Pazaryerlerinden gelen siparişler, hazırlık ve kargo durumu."
      />
      <Tabs
        active="orders"
        items={[
          { key: "orders", label: "Siparişler", href: "/panel/siparisler" },
          { key: "returns", label: "İadeler", href: "/panel/iadeler" },
          { key: "messages", label: "Alıcı mesajları", href: "/panel/mesajlar" },
        ]}
      />
      <div className="card" style={{ marginBottom: 18 }}>
        <h2 style={{ marginTop: 0, fontSize: 19 }}>Satış kanalları</h2>
        {hata ? (
          <p className="note" role="alert" style={{ color: "var(--red, #b42318)" }}>
            {hata}
          </p>
        ) : null}
        {reg.salesLocked ? (
          <p className="note">
            Satış kanalları vergi numaraları tamamlanınca bağlanabilir. Bu arada ürün kartlarınızı
            ve ilk sevkiyatınızı hazırlayabilirsiniz.
          </p>
        ) : (
          <div className="row">
            {CHANNELS.map((ch) => {
              const c = conns.find((x) => x.channel === ch);
              const needsCreds = live() && owner && (!c || c.mode !== "live" || !c.credentialsEnc);
              return (
                <div
                  key={ch}
                  id={`kanal-${ch}`}
                  className="card"
                  style={{ padding: 14, minWidth: 240 }}
                >
                  <b>{CHANNEL_LABEL[ch]}</b>{" "}
                  {c ? (
                    <span className="tag ok">Bağlı{c.mode === "mock" ? " (demo)" : ""}</span>
                  ) : (
                    <span className="tag">Bağlı değil</span>
                  )}
                  <div className="muted" style={{ fontSize: 12, margin: "6px 0" }}>
                    {c?.lastSyncAt ? `Son senkron: ${fmtDate(c.lastSyncAt, true)}` : ""}
                  </div>
                  {needsCreds ? (
                    <form action={connectLiveAction} autoComplete="off" className="form">
                      <input type="hidden" name="channel" value={ch} />
                      {LIVE_FIELDS[ch].map((f) => (
                        <div key={f.name} className="field">
                          <label htmlFor={`live-${ch}-${f.name}`}>{f.label}</label>
                          <input
                            id={`live-${ch}-${f.name}`}
                            name={f.name}
                            type={f.secret ? "password" : "text"}
                            required={!f.optional}
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </div>
                      ))}
                      <Submit className="btn btn-sm" pendingText="…">
                        Canlı bağla
                      </Submit>
                    </form>
                  ) : c ? (
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
      <Toolbar
        q={q.q}
        placeholder="Sipariş no, SKU veya takip no"
        keep={{ sirala: q.sirala }}
        filters={[
          {
            name: "durum",
            label: "Durum",
            value: q.durum,
            options: Object.entries(ORDER_STATUS).map(([value, v]) => ({ value, label: v[0] })),
          },
          {
            name: "kanal",
            label: "Kanal",
            value: q.kanal,
            options: Object.entries(CHANNEL_LABEL).map(([value, label]) => ({ value, label })),
          },
        ]}
      />
      <div className="tw">
        <table className="tbl tbl-stack">
          <thead>
            <tr>
              <SortTh label="Tarih" field="tarih" sort={q.sirala} params={params} />
              <th>Kanal / No</th>
              <th>Alıcı</th>
              <th>Ürünler</th>
              <SortTh label="Tutar" field="tutar" sort={q.sirala} params={params} />
              <th>Durum</th>
              <th>Takip</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const to = shipTo(o.shipToEnc);
              return (
                <tr key={o.id}>
                  <td data-l="Tarih">{fmtDate(o.orderedAt, true)}</td>
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
          </tbody>
        </table>
        {orders.length === 0 && (
          <EmptyState
            title={q.q || q.durum || q.kanal ? "Sonuç yok" : "Henüz sipariş yok"}
            text={
              q.q || q.durum || q.kanal
                ? "Filtreleri değiştirip tekrar deneyin."
                : "Bir pazaryeri bağlandığında siparişler otomatik olarak burada görünür."
            }
          />
        )}
      </div>
      <Pager page={page} pageSize={size} total={total} params={params} />
    </>
  );
}
