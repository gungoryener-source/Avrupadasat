import Link from "next/link";
import { brand } from "@avrupadasat/core/brand.config";
import { PRICE_LIST_VERSION } from "@avrupadasat/core/pricing";
import { Badge, Card, PageHeader } from "@/components/panel/ui";
import { db } from "@/server/db";
import { env, SESSION_DAYS, SESSION_IDLE_MINUTES } from "@/server/env";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Ayarlar" };

/** Salt okunur sistem durumu. Gizli değerler gösterilmez; yalnız "tanımlı mı" bilgisi. */
export default async function Settings() {
  await requireStaff("audit.read");
  const [pending, failed, lastProcessed] = await Promise.all([
    db().outboxEvent.count({ where: { processedAt: null, attempts: { lt: 5 } } }),
    db().outboxEvent.count({ where: { processedAt: null, attempts: { gte: 5 } } }),
    db().outboxEvent.findFirst({
      where: { processedAt: { not: null } },
      orderBy: { processedAt: "desc" },
      select: { processedAt: true },
    }),
  ]);
  const live = env.integrationsMode === "live";
  const set = (v?: string) =>
    v ? <Badge tone="green">Tanımlı</Badge> : <Badge tone="amber">Tanımlı değil</Badge>;
  return (
    <>
      <PageHeader
        title="Ayarlar"
        desc="Sistem yapılandırması ortam değişkenleri ve kod üzerinden yönetilir; bu sayfa durumu gösterir."
      />
      <div className="grid grid-2">
        <Card title="Genel">
          <dl className="kv">
            <dt>Marka</dt>
            <dd>{brand.name}</dd>
            <dt>Alan adı</dt>
            <dd>
              {brand.domain} <Badge tone="amber">Karar bekliyor</Badge>
            </dd>
            <dt>Fiyat listesi</dt>
            <dd>
              {PRICE_LIST_VERSION} <Link href="/fiyatlar">Sitede gör</Link>
            </dd>
            <dt>Ortam</dt>
            <dd>
              {process.env.DEMO_ENVIRONMENT === "1" ? (
                <Badge tone="amber">Demo ortamı</Badge>
              ) : env.isProd ? (
                <Badge tone="green">Üretim</Badge>
              ) : (
                <Badge>Geliştirme</Badge>
              )}
            </dd>
          </dl>
        </Card>
        <Card title="Entegrasyonlar">
          <dl className="kv">
            <dt>Amazon.de / eBay.de</dt>
            <dd>
              {live ? (
                <Badge tone="green">Canlı API</Badge>
              ) : (
                <Badge tone="amber">Demo modu (örnek veri)</Badge>
              )}
            </dd>
            <dt>Ödeme sağlayıcı</dt>
            <dd>
              <Badge>Bağlı değil</Badge>{" "}
              <span className="muted" style={{ fontSize: 13 }}>
                Faturalar banka havalesiyle ödenir; ödeme ekipçe işaretlenir.
              </span>
            </dd>
            <dt>E-posta gönderimi (SMTP)</dt>
            <dd>{set(process.env.SMTP_URL)}</dd>
            <dt>Google Tag Manager</dt>
            <dd>{set(env.gtmId)}</dd>
            <dt>Meta Conversions API</dt>
            <dd>{set(process.env.META_CAPI_TOKEN)}</dd>
            <dt>Turnstile (form koruması)</dt>
            <dd>{set(env.turnstileSecret)}</dd>
            <dt>Dosya depolama</dt>
            <dd>
              {process.env.STORAGE_DRIVER === "blob" ? (
                <Badge tone="green">Vercel Blob (özel)</Badge>
              ) : process.env.STORAGE_DRIVER === "s3" ? (
                <Badge tone="green">S3 (AB)</Badge>
              ) : process.env.VERCEL ? (
                <Badge tone="red">Geçici disk — dosyalar kalıcı değil</Badge>
              ) : (
                <Badge>Yerel disk</Badge>
              )}
            </dd>
            <dt>Virüs taraması (ClamAV)</dt>
            <dd>{set(process.env.CLAMAV_HOST)}</dd>
          </dl>
        </Card>
        <Card title="Olay kuyruğu (e-posta ve bildirimler)">
          <dl className="kv">
            <dt>Bekleyen</dt>
            <dd>{pending}</dd>
            <dt>Başarısız (5 deneme)</dt>
            <dd>{failed > 0 ? <Badge tone="red">{failed}</Badge> : 0}</dd>
            <dt>Son işlenen</dt>
            <dd>{lastProcessed?.processedAt?.toLocaleString("tr-TR") ?? "—"}</dd>
          </dl>
        </Card>
        <Card title="Güvenlik">
          <dl className="kv">
            <dt>Oturum süresi</dt>
            <dd>{SESSION_DAYS} gün</dd>
            <dt>Hareketsizlik</dt>
            <dd>{SESSION_IDLE_MINUTES} dakika</dd>
            <dt>2FA</dt>
            <dd>Ekip ve firma yöneticileri için zorunlu</dd>
            <dt>Personel</dt>
            <dd>
              <Link href="/admin/personel">Personel ve yetkiler</Link>
            </dd>
          </dl>
        </Card>
      </div>
    </>
  );
}
