import Link from "next/link";
import { forTenant } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { Badge, Card, PageHeader } from "@/components/panel/ui";
import { IconPlug } from "@/components/site/Icons";
import { db } from "@/server/db";
import { CHANNEL_LABEL } from "@/server/labels-ops";
import { registrationState } from "@/server/panel";
import { requireClient } from "@/server/session";

export const metadata = { title: "Pazaryerleri" };

const CHANNELS = [
  { ch: "AMAZON", name: "Amazon Almanya", api: "Selling Partner API (SP-API)" },
  { ch: "EBAY", name: "eBay Almanya", api: "eBay Sell API" },
  { ch: "WEBSHOP", name: "Shopify", api: "Shopify Admin API + webhook" },
] as const;

export default async function MarketplacesPage() {
  const s = await requireClient("order.read");
  const t = forTenant(db(), s.actor.tenantId);
  const [conns, reg, counts] = await Promise.all([
    t.marketplaceConnection.findMany(),
    registrationState(s.actor.tenantId),
    t.order.groupBy({ by: ["channel"], _count: true }),
  ]);
  const liveEnabled = (process.env.INTEGRATIONS_MODE ?? "mock") === "live";
  return (
    <>
      <PageHeader
        title="Pazaryerleri"
        desc="Satış kanallarınızın bağlantı ve senkronizasyon durumu. Bağlantı ayarları Siparişler sayfasındadır."
        actions={
          <Link href="/panel/siparisler#kanal-AMAZON" className="btn">
            Bağlantıları yönet
          </Link>
        }
      />
      {!liveEnabled && (
        <div className="note" style={{ padding: "12px 16px", marginBottom: 16 }}>
          <b>Demo modu.</b> Bu ortamda pazaryeri bağlantıları gerçek API&apos;ye bağlanmaz;
          siparişler örnek veriyle üretilir. Gerçek bağlantı, API anahtarları tanımlanıp canlı moda
          geçildiğinde açılır.
        </div>
      )}
      {reg.salesLocked && (
        <div className="alert-warn" style={{ padding: "12px 16px", marginBottom: 16 }}>
          Satış kanalları vergi numaraları tamamlanınca bağlanabilir.
        </div>
      )}
      <div className="grid grid-3">
        {CHANNELS.map(({ ch, name, api }) => {
          const c = conns.find((x) => x.channel === ch);
          const orders = counts.find((x) => x.channel === ch)?._count ?? 0;
          const state = !c
            ? "none"
            : c.status !== "ACTIVE"
              ? "off"
              : c.mode === "live"
                ? "live"
                : "demo";
          return (
            <Card
              key={ch}
              title={
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <IconPlug size={18} /> {name}
                </span>
              }
              action={
                state === "live" ? (
                  <Badge tone="green">Bağlı (canlı)</Badge>
                ) : state === "demo" ? (
                  <Badge tone="blue">Bağlı (demo)</Badge>
                ) : state === "off" ? (
                  <Badge tone="amber">Durduruldu</Badge>
                ) : (
                  <Badge>Bağlı değil</Badge>
                )
              }
            >
              <dl className="kv">
                <dt>Kanal</dt>
                <dd>{CHANNEL_LABEL[ch]}</dd>
                <dt>Entegrasyon</dt>
                <dd>{api}</dd>
                <dt>Mağaza</dt>
                <dd>{c?.externalAccount ?? "—"}</dd>
                <dt>Son senkronizasyon</dt>
                <dd>{c?.lastSyncAt ? fmtDate(c.lastSyncAt, true) : "—"}</dd>
                <dt>Sipariş</dt>
                <dd>{orders}</dd>
                <dt>Son hata</dt>
                <dd>
                  {c?.lastError ? (
                    <span style={{ color: "var(--err)" }}>{c.lastError}</span>
                  ) : (
                    "Yok"
                  )}
                </dd>
              </dl>
              <div style={{ marginTop: 16 }}>
                <Link className="btn btn-o btn-sm" href={`/panel/siparisler#kanal-${ch}`}>
                  {c ? "Yönet" : "Bağla"}
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
