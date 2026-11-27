import Link from "next/link";
import { fmtDate } from "@/components/AppShell";
import { ActionForm } from "@/components/panel/ActionForm";
import { Badge, Card, EmptyState, PageHeader } from "@/components/panel/ui";
import { Submit } from "@/components/Submit";
import { COMPANY_FORM_LABEL, getCompany } from "@/server/company";
import { listDocuments, DOC_REVIEW_LABEL } from "@/server/documents";
import { signDownload } from "@/server/files";
import { requireClient } from "@/server/session";
import { UploadForm } from "../forms";
import { requestCompanyChangeAction } from "../portal-actions";

export const metadata = { title: "Şirketim" };

const STATUS: Record<string, [string, "blue" | "green" | "amber" | "neutral"]> = {
  ONBOARDING: ["Kuruluş / kurulum sürüyor", "blue"],
  ACTIVE: ["Aktif", "green"],
  PAUSED: ["Durduruldu", "amber"],
  CLOSED: ["Kapalı", "neutral"],
};

export default async function CompanyPage() {
  const s = await requireClient("tenant.read");
  const c = await getCompany(s.actor.tenantId);
  const docs = await listDocuments(s.actor.tenantId, { kind: "SIRKET", pageSize: 10 });
  const [st, tone] = STATUS[c.status] ?? [c.status, "neutral"];
  const v = (x: string | null | undefined) => x || <span className="muted">Henüz girilmedi</span>;
  return (
    <>
      <PageHeader
        title="Şirketim"
        desc="Almanya'daki şirketinizin resmî bilgileri. Değişiklikler ekip onayıyla ve gerekirse noter/sicil işlemiyle yapılır."
        actions={<Badge tone={tone}>{st}</Badge>}
      />
      <div className="grid grid-main">
        <div className="stack">
          <Card title="Şirket bilgileri">
            <dl className="kv">
              <dt>Ticaret unvanı</dt>
              <dd>{v(c.legalName)}</dd>
              <dt>Şirket türü</dt>
              <dd>{c.companyForm ? COMPANY_FORM_LABEL[c.companyForm] : v(null)}</dd>
              <dt>Ticaret sicil no</dt>
              <dd>
                {c.registerNumber
                  ? `${c.registerNumber}${c.registerCourt ? ` · ${c.registerCourt}` : ""}`
                  : v(null)}
              </dd>
              <dt>Almanya iş adresi</dt>
              <dd style={{ whiteSpace: "pre-line" }}>{v(c.businessAddress)}</dd>
              <dt>KDV kimlik no (USt-IdNr.)</dt>
              <dd className="mono">{v(c.vatId)}</dd>
              <dt>Vergi numarası</dt>
              <dd className="mono">{v(c.taxNumber)}</dd>
              <dt>Tescil tarihi</dt>
              <dd>{c.registeredAt ? fmtDate(c.registeredAt) : v(null)}</dd>
            </dl>
            <p className="muted" style={{ fontSize: 13, margin: "12px 0 0" }}>
              Vergi numarası güvenlik için maskeli gösterilir. Kayıt adımlarının durumu{" "}
              <Link href="/panel/sirket">Şirket Kuruluşu</Link> sayfasında.
            </p>
          </Card>
          <Card title="Yetkili temsilciler">
            {c.representatives.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Kuruluş tamamlanınca genel müdür ve yetkililer burada görünür.
              </p>
            ) : (
              <ul className="ls">
                {c.representatives.map((r) => (
                  <li key={r.name}>
                    <div className="ls-main">
                      <b>{r.name}</b>
                      <small>{r.role}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card
            title="Şirket belgeleri"
            action={<Link href="/panel/belgeler?tur=SIRKET">Tümü</Link>}
          >
            {docs.items.length === 0 ? (
              <EmptyState
                title="Şirket belgesi yok"
                text="Ticaret sicil kaydı, vekâletname, ortaklık sözleşmesi gibi belgeleri yükleyin."
              />
            ) : (
              <ul className="ls" style={{ marginBottom: 16 }}>
                {docs.items.map((d) => (
                  <li key={d.id}>
                    <div className="ls-main">
                      <a href={signDownload(d.id, s.userId)}>{d.filename}</a>
                      <small>
                        {fmtDate(d.createdAt)}
                        {d.expiresAt ? ` · geçerlilik ${fmtDate(d.expiresAt)}` : ""}
                      </small>
                    </div>
                    <Badge
                      tone={
                        d.review === "APPROVED"
                          ? "green"
                          : d.review === "REJECTED"
                            ? "red"
                            : "amber"
                      }
                    >
                      {DOC_REVIEW_LABEL[d.review]}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <UploadForm defaultKind="SIRKET" />
          </Card>
        </div>
        <div className="stack">
          <Card title="Değişiklik talep et">
            <ActionForm action={requestCompanyChangeAction}>
              <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                Adres, unvan veya yetkili değişikliği resmî işlem gerektirir. Talebiniz destek
                ekibine iletilir; gereken belge ve ücretler size bildirilir.
              </p>
              <div className="field">
                <label htmlFor="field">Değişecek bilgi</label>
                <select id="field" name="field" defaultValue="Almanya iş adresi">
                  <option>Almanya iş adresi</option>
                  <option>Ticaret unvanı</option>
                  <option>Yetkili temsilci</option>
                  <option>Vergi / KDV bilgisi</option>
                  <option>Diğer</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="value">Yeni değer</label>
                <textarea id="value" name="value" rows={3} required />
              </div>
              <div className="field">
                <label htmlFor="reason">Açıklama (isteğe bağlı)</label>
                <input id="reason" name="reason" />
              </div>
              <div>
                <Submit>Talep gönder</Submit>
              </div>
            </ActionForm>
          </Card>
          <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
            Bu sayfadaki bilgiler hukuki veya vergisel danışmanlık değildir. Resmî işlemler lisanslı
            iş ortaklarımızca yürütülür.
          </p>
        </div>
      </div>
    </>
  );
}
