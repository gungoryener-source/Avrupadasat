import Link from "next/link";
import { forTenant } from "@avrupadasat/db";
import { formatEur, packages } from "@avrupadasat/core/pricing";
import { fmtDate } from "@/components/AppShell";
import { ActionForm } from "@/components/panel/ActionForm";
import { Badge, Card, EmptyState, PageHeader } from "@/components/panel/ui";
import { IconCard } from "@/components/site/Icons";
import { Submit } from "@/components/Submit";
import { db } from "@/server/db";
import { INVOICE_STATUS } from "@/server/labels-ops";
import { requireClient } from "@/server/session";
import { requestPlanChangeAction } from "../portal-actions";

export const metadata = { title: "Abonelik ve Ödemeler" };

const PLAN_DESC: Record<string, string> = {
  BASLANGIC: "Almanya'da şirket kuruluşu (tek sefer)",
  OPERASYON: "İş adresi, muhasebe koordinasyonu, stok ve sevkiyat yazılımı",
  PAZARA_GIRIS: "Depo, fulfillment, gümrük takibi, Amazon.de/eBay.de, Almanca içerik ve pazarlama",
};

export default async function SubscriptionPage() {
  const s = await requireClient("invoice.read");
  const t = forTenant(db(), s.actor.tenantId);
  const [tenant, invoices, contract] = await Promise.all([
    db().tenant.findUniqueOrThrow({
      where: { id: s.actor.tenantId },
      select: { packageCode: true, status: true },
    }),
    t.invoice.findMany({
      where: { status: { not: "DRAFT" } },
      orderBy: { period: "desc" },
      take: 24,
    }),
    t.contract.findFirst({ orderBy: { signedAt: "desc" } }),
  ]);
  const code = tenant.packageCode as keyof typeof packages | null;
  const plan = code ? packages[code] : null;
  const monthly =
    code === "OPERASYON"
      ? packages.OPERASYON.monthly
      : code === "PAZARA_GIRIS"
        ? packages.PAZARA_GIRIS.monthly
        : 0;
  const open = invoices.filter((i) => i.status === "ISSUED");
  const openTotal = open.reduce((a, i) => a + i.grossCents, 0);
  const now = new Date();
  // Aylık faturalar dönem sonunda kesilir: bir sonraki fatura ayın ilk iş günlerinde
  const nextInvoice = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const canRequest = s.actor.role === "CLIENT_OWNER";
  return (
    <>
      <PageHeader
        title="Abonelik ve Ödemeler"
        desc="Paketiniz, faturalarınız ve ödeme durumunuz."
      />
      <div className="grid grid-main">
        <div className="stack">
          <Card title="Aktif paket">
            {plan ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <b style={{ fontSize: 22, fontWeight: 600 }}>{plan.name}</b>
                  {monthly > 0 && (
                    <span className="muted">{formatEur(monthly)}/ay + kullanım, KDV hariç</span>
                  )}
                </div>
                <p className="muted" style={{ margin: "6px 0 16px" }}>
                  {PLAN_DESC[code!]}
                </p>
                <dl className="kv">
                  <dt>Sözleşme</dt>
                  <dd>
                    {contract
                      ? `${fmtDate(contract.signedAt)} tarihinde ${contract.signerName} onayladı`
                      : "—"}
                  </dd>
                  <dt>Sonraki fatura</dt>
                  <dd>
                    {monthly > 0
                      ? `${fmtDate(nextInvoice)} civarı (dönem sonu)`
                      : "Aylık ücret yok"}
                  </dd>
                  <dt>Fesih</dt>
                  <dd>1 ay önceden bildirimle</dd>
                </dl>
              </>
            ) : (
              <EmptyState
                icon={<IconCard size={20} />}
                title="Henüz paket yok"
                text="Teklifinizi onayladığınızda paketiniz burada görünür."
              />
            )}
          </Card>
          <Card title="Faturalar ve ödeme geçmişi" pad={false}>
            {invoices.length === 0 ? (
              <EmptyState
                title="Fatura yok"
                text="Aylık hizmet faturalarınız kesildiğinde burada listelenir."
              />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="tbl tbl-stack">
                  <thead>
                    <tr>
                      <th>Fatura no</th>
                      <th>Dönem</th>
                      <th>Kesim</th>
                      <th>Vade</th>
                      <th className="num">Tutar</th>
                      <th>Ödeme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <a href={`/fatura/${i.id}`}>{i.number}</a>
                        </td>
                        <td data-l="Dönem" className="mono">
                          {i.period}
                        </td>
                        <td data-l="Kesim">{fmtDate(i.issuedAt)}</td>
                        <td data-l="Vade">{fmtDate(i.dueAt)}</td>
                        <td data-l="Tutar" className="num">
                          {formatEur(i.grossCents, { decimals: true })}
                        </td>
                        <td>
                          <Badge
                            tone={
                              i.status === "PAID"
                                ? "green"
                                : i.status === "VOID"
                                  ? "red"
                                  : i.dueAt && +i.dueAt < +now
                                    ? "red"
                                    : "amber"
                            }
                          >
                            {i.status === "PAID"
                              ? `Ödendi ${fmtDate(i.paidAt)}`
                              : i.status === "ISSUED" && i.dueAt && +i.dueAt < +now
                                ? "Vadesi geçti"
                                : INVOICE_STATUS[i.status][0]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
        <div className="stack">
          <Card title="Ödeme durumu">
            <dl className="kv">
              <dt>Açık fatura</dt>
              <dd>{open.length}</dd>
              <dt>Açık tutar</dt>
              <dd>{formatEur(openTotal, { decimals: true })}</dd>
              <dt>Ödeme yöntemi</dt>
              <dd>Banka havalesi (fatura üzerindeki IBAN)</dd>
            </dl>
            <p className="muted" style={{ fontSize: 12.5, margin: "12px 0 0" }}>
              Online kart ödemesi henüz bağlı değil. Ödemeniz bankaya ulaştığında muhasebe ekibimiz
              faturayı &quot;Ödendi&quot; olarak işaretler.
            </p>
          </Card>
          <Card title="Paket değiştir">
            {canRequest ? (
              <ActionForm action={requestPlanChangeAction}>
                <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                  Yükseltme veya düşürme talebiniz ekibimize iletilir; ücret ve başlangıç tarihi
                  onaylanmadan değişiklik yapılmaz, ödeme alınmaz.
                </p>
                <div className="field">
                  <label htmlFor="plan">İstenen paket</label>
                  <select
                    id="plan"
                    name="plan"
                    defaultValue={code === "PAZARA_GIRIS" ? "OPERASYON" : "PAZARA_GIRIS"}
                  >
                    {(Object.keys(packages) as (keyof typeof packages)[]).map((k) => (
                      <option key={k} value={k} disabled={k === code}>
                        {packages[k].name}
                        {k === code ? " (mevcut)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="note">Not (isteğe bağlı)</label>
                  <textarea id="note" name="note" rows={3} />
                </div>
                <div>
                  <Submit>Talep gönder</Submit>
                </div>
              </ActionForm>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Paket değişikliğini firma yöneticisi talep edebilir.
              </p>
            )}
            <p style={{ margin: "12px 0 0", fontSize: 13 }}>
              <Link href="/fiyatlar">Paketleri karşılaştır</Link>
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
