import Link from "next/link";
import { notFound } from "next/navigation";
import { LEAD_CHANNEL_LABEL, LEAD_EXPORT_STATUS_LABEL, leadProfile } from "@avrupadasat/core";
import { formatEur } from "@avrupadasat/core/pricing";
import { fmtDate } from "@/components/AppShell";
import { Submit } from "@/components/Submit";
import { db } from "@/server/db";
import { LEAD_STATUS_LABEL } from "@/server/leads";
import { QUOTE_STATUS_LABEL } from "@/server/quotes";
import { requireStaff } from "@/server/session";
import { createQuoteAction, updateLeadAction } from "../../actions";

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("lead.read");
  const { id } = await params;
  const lead = await db().lead.findUnique({
    where: { id },
    include: { quotes: { orderBy: { createdAt: "desc" } } },
  });
  if (!lead) notFound();
  const attr = lead.attribution as Record<string, string>;
  const parsedProfile = leadProfile.safeParse(lead.profile);
  const profile = parsedProfile.success ? parsedProfile.data : {};
  return (
    <>
      <p>
        <Link href="/admin/talepler">← Talepler</Link>
      </p>
      <h1>{lead.companyName}</h1>
      <div className="g2">
        <div className="card">
          <h3>İletişim</h3>
          <p>
            {profile.contactName && (
              <>
                <b>{profile.contactName}</b>
                <br />
              </>
            )}
            {lead.email}
            <br />
            {lead.phone}
          </p>
          {(profile.city ||
            profile.website ||
            profile.channels?.length ||
            profile.exportStatus) && (
            <dl className="lead-profile" style={{ fontSize: 14, display: "grid", gap: 6 }}>
              {profile.city && (
                <div>
                  <dt className="muted">Şehir</dt>
                  <dd style={{ margin: 0 }}>{profile.city}</dd>
                </div>
              )}
              {profile.website && (
                <div>
                  <dt className="muted">Web sitesi</dt>
                  <dd style={{ margin: 0 }}>{profile.website}</dd>
                </div>
              )}
              {profile.channels && profile.channels.length > 0 && (
                <div>
                  <dt className="muted">Hedef kanallar</dt>
                  <dd style={{ margin: 0 }}>
                    {profile.channels.map((c) => LEAD_CHANNEL_LABEL[c]).join(", ")}
                  </dd>
                </div>
              )}
              {profile.exportStatus && (
                <div>
                  <dt className="muted">İhracat durumu</dt>
                  <dd style={{ margin: 0 }}>{LEAD_EXPORT_STATUS_LABEL[profile.exportStatus]}</dd>
                </div>
              )}
            </dl>
          )}
          <p className="muted" style={{ fontSize: 13 }}>
            Kategori: {lead.category} · {fmtDate(lead.createdAt, true)}
            <br />
            KVKK onayı: {lead.consentKvkk ? "var" : "yok"} · Pazarlama izni:{" "}
            {lead.marketingConsent ? "var" : "yok"}
          </p>
          {Object.keys(attr).length > 0 && (
            <p className="mono" style={{ fontSize: 12 }}>
              {Object.entries(attr)
                .map(([k, v]) => `${k}=${v}`)
                .join(" · ")}
            </p>
          )}
          {lead.tenantId && (
            <p>
              <Link href={`/admin/musteriler/${lead.tenantId}`}>Müşteri kartına git →</Link>
            </p>
          )}
        </div>
        <form action={updateLeadAction} className="card form">
          <h3 style={{ margin: 0 }}>Durum ve notlar</h3>
          <input type="hidden" name="id" value={lead.id} />
          <div className="field">
            <label htmlFor="status">Durum</label>
            <select id="status" name="status" defaultValue={lead.status}>
              {Object.entries(LEAD_STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="notes">Notlar (ön değerlendirme)</label>
            <textarea id="notes" name="notes" rows={5} defaultValue={lead.notes ?? ""} />
          </div>
          <Submit>Kaydet</Submit>
        </form>
      </div>

      <h2 style={{ marginTop: 28 }}>Teklifler</h2>
      {lead.quotes.length > 0 && (
        <table className="tbl" style={{ marginBottom: 18 }}>
          <tbody>
            {lead.quotes.map((q) => (
              <tr key={q.id}>
                <td>
                  <Link href={`/admin/teklifler/${q.id}`}>{q.number}</Link>
                </td>
                <td>{q.packageCode}</td>
                <td>
                  {formatEur(q.oneTimeCents)} + {formatEur(q.monthlyCents)}/ay
                </td>
                <td>
                  <span className="tag">{QUOTE_STATUS_LABEL[q.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {lead.status !== "WON" && (
        <form action={createQuoteAction} className="card inline-form">
          <input type="hidden" name="leadId" value={lead.id} />
          <div className="field">
            <label htmlFor="packageCode">Paket</label>
            <select id="packageCode" name="packageCode" defaultValue="PAZARA_GIRIS">
              <option value="BASLANGIC">Başlangıç</option>
              <option value="OPERASYON">Operasyon</option>
              <option value="PAZARA_GIRIS">Pazara Giriş</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="companyForm">Şirket</label>
            <select id="companyForm" name="companyForm" defaultValue="UG">
              <option value="UG">UG</option>
              <option value="GMBH">GmbH</option>
              <option value="NONE">Kuruluş yok (Türk firmasıyla)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="pallets">Tahmini palet</label>
            <input
              id="pallets"
              name="pallets"
              type="number"
              min={0}
              defaultValue={10}
              style={{ width: 110 }}
            />
          </div>
          <Submit>Teklif oluştur</Submit>
        </form>
      )}
    </>
  );
}
