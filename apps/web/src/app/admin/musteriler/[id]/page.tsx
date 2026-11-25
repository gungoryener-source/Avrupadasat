import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { canAccessTenant } from "@avrupadasat/core/roles";
import { fmtDate } from "@/components/AppShell";
import { Submit } from "@/components/Submit";
import { db } from "@/server/db";
import { PACKAGE_LABEL, STEP_LABEL, STEP_STATUS, TENANT_STATUS } from "@/server/labels";
import { requireStaff } from "@/server/session";
import { resendInviteAction } from "../../actions";
import {
  stockCountAction,
  updateRegistrationAction,
  updateTenantStatusAction,
} from "../../ops-actions";

export default async function TenantDetail({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff("tenant.read");
  const { id } = await params;
  if (!canAccessTenant(s.actor, id)) redirect("/admin?hata=yetki");
  const t = await db().tenant.findUnique({
    where: { id },
    include: {
      memberships: { include: { user: true } },
      contacts: true,
      contracts: { include: { quote: true } },
      registration: { orderBy: { step: "asc" } },
    },
  });
  if (!t) notFound();
  const pendingInvites = await db().authToken.findMany({
    where: {
      userId: { in: t.memberships.map((m) => m.userId) },
      purpose: "INVITE",
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  return (
    <>
      <p>
        <Link href="/admin/musteriler">← Müşteriler</Link>
      </p>
      <h1>
        {t.name} <span className="tag">{TENANT_STATUS[t.status]}</span>
      </h1>
      <p className="muted">
        {t.packageCode ? PACKAGE_LABEL[t.packageCode] : "Paket yok"} · Başlangıç{" "}
        {fmtDate(t.createdAt)} · <Link href={`/admin/sevkiyatlar?firma=${t.id}`}>Sevkiyatlar</Link>{" "}
        · <Link href={`/admin/siparisler?firma=${t.id}`}>Siparişler</Link> ·{" "}
        <Link href={`/admin/faturalar?firma=${t.id}`}>Faturalar</Link>
      </p>
      <div className="g2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Kuruluş ve kayıt adımları</h3>
          <table className="tbl">
            <tbody>
              {t.registration.map((r) => (
                <tr key={r.id}>
                  <td>{STEP_LABEL[r.step]}</td>
                  <td>
                    <form action={updateRegistrationAction} className="inline-form">
                      <input type="hidden" name="tenantId" value={t.id} />
                      <input type="hidden" name="step" value={r.step} />
                      <select name="status" defaultValue={r.status} aria-label="Durum">
                        {Object.entries(STEP_STATUS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <input
                        name="note"
                        defaultValue={r.note ?? ""}
                        placeholder="Not"
                        style={{ width: 140 }}
                        aria-label="Not"
                      />
                      <Submit className="btn btn-o btn-sm" pendingText="…">
                        Kaydet
                      </Submit>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form action={updateTenantStatusAction} className="inline-form" style={{ marginTop: 14 }}>
            <input type="hidden" name="tenantId" value={t.id} />
            <select name="status" defaultValue={t.status} aria-label="Firma durumu">
              {Object.entries(TENANT_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <Submit className="btn btn-o btn-sm">Firma durumunu kaydet</Submit>
          </form>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Kullanıcılar</h3>
          <table className="tbl">
            <tbody>
              {t.memberships.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.user.name}
                    <div className="muted" style={{ fontSize: 12 }}>
                      {m.user.email}
                    </div>
                  </td>
                  <td>{m.role === "CLIENT_OWNER" ? "Firma sahibi" : "Kullanıcı"}</td>
                  <td>
                    {m.user.passwordHash ? (
                      <span className="tag ok">Aktif</span>
                    ) : (
                      <form action={resendInviteAction}>
                        <input type="hidden" name="userId" value={m.userId} />
                        <input type="hidden" name="tenantId" value={t.id} />
                        <span className="tag warn">
                          {pendingInvites.some((p) => p.userId === m.userId)
                            ? "Davet bekliyor"
                            : "Davet süresi doldu"}
                        </span>{" "}
                        <Submit className="btn btn-o btn-sm" pendingText="…">
                          Daveti yeniden gönder
                        </Submit>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>Yetkililer</h3>
          {t.contacts.map((c) => (
            <p key={c.id} style={{ fontSize: 14 }}>
              <b>{c.name}</b> {c.isPrimary && <span className="tag">Ana yetkili</span>}
              <br />
              {c.email} · {c.phone}
            </p>
          ))}
          <h3>Stok sayımı (CSV: sku;miktar)</h3>
          <form action={stockCountAction} className="form">
            <input type="hidden" name="tenantId" value={t.id} />
            <textarea
              name="csv"
              rows={3}
              placeholder={"sku;miktar\nHV-1;120"}
              aria-label="Sayım CSV"
            />
            <Submit className="btn btn-o btn-sm">Sayımı işle</Submit>
          </form>
          <h3>Sözleşmeler</h3>
          {t.contracts.map((c) => (
            <p key={c.id} style={{ fontSize: 14 }}>
              <Link href={`/admin/teklifler/${c.quoteId}`}>{c.quote.number}</Link> · {c.signerName}{" "}
              · {fmtDate(c.signedAt, true)} · şartlar {c.termsVersion}
            </p>
          ))}
        </div>
      </div>
    </>
  );
}
