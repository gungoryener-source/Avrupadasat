import Link from "next/link";
import { notFound } from "next/navigation";
import { can } from "@avrupadasat/core/roles";
import { fmtDate } from "@/components/AppShell";
import { ActionForm, FieldError } from "@/components/panel/ActionForm";
import { TICKET_TONE } from "@/components/panel/tones";
import { Badge, Card, PageHeader } from "@/components/panel/ui";
import { Submit } from "@/components/Submit";
import { staffOptions } from "@/server/admin-data";
import { db } from "@/server/db";
import { signDownload } from "@/server/files";
import { requireStaff } from "@/server/session";
import {
  PRIORITY_LABEL,
  TICKET_CATEGORIES,
  TICKET_STATUS_LABEL,
  getTicket,
} from "@/server/tickets";
import { staffReplyTicketAction, staffUpdateTicketAction } from "../../portal-actions";

export const metadata = { title: "Destek talebi" };

export default async function AdminTicket({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff("ticket.read");
  const { id } = await params;
  const t = await getTicket(s.actor, id);
  if (!t) notFound();
  const write = can(s.actor.role, "ticket.write");
  const staff = await staffOptions();
  const docIds = t.messages.map((m) => m.documentId).filter(Boolean) as string[];
  const docs = docIds.length
    ? await db().document.findMany({
        where: { id: { in: docIds }, tenantId: t.tenantId },
        select: { id: true, filename: true },
      })
    : [];
  const docName = Object.fromEntries(docs.map((d) => [d.id, d.filename]));
  return (
    <>
      <PageHeader
        title={`#${t.number} ${t.subject}`}
        crumbs={[{ href: "/admin/destek", label: "Destek talepleri" }]}
        desc={
          <>
            <Link href={`/admin/musteriler/${t.tenantId}`}>{t.tenant.name}</Link> ·{" "}
            {TICKET_CATEGORIES[t.category as keyof typeof TICKET_CATEGORIES] ?? t.category} · açıldı{" "}
            {fmtDate(t.createdAt, true)}
          </>
        }
        actions={<Badge tone={TICKET_TONE[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Badge>}
      />
      <div className="grid grid-main">
        <div>
          <div className="thread">
            {t.messages.map((m) => (
              <article
                key={m.id}
                className={`msg${m.internal ? " msg-int" : m.fromStaff ? " msg-me" : ""}`}
              >
                <div className="msg-h">
                  <b>
                    {t.names[m.authorId] ?? "—"}
                    {m.internal
                      ? " · İç not (müşteri görmez)"
                      : m.fromStaff
                        ? " · Ekip"
                        : " · Müşteri"}
                  </b>
                  <span>{fmtDate(m.createdAt, true)}</span>
                </div>
                <p>{m.body}</p>
                {m.documentId && docName[m.documentId] && (
                  <p style={{ marginTop: 8 }}>
                    <a href={signDownload(m.documentId, s.userId)}>Ek: {docName[m.documentId]}</a>
                  </p>
                )}
              </article>
            ))}
          </div>
          {write && (
            <div className="pc" style={{ marginTop: 20 }}>
              <ActionForm action={staffReplyTicketAction}>
                <input type="hidden" name="id" value={t.id} />
                <div className="field">
                  <label htmlFor="body">Yanıt veya iç not</label>
                  <textarea id="body" name="body" rows={5} required />
                  <FieldError name="body" />
                </div>
                <label className="chk">
                  <input type="checkbox" name="internal" /> İç not olarak kaydet (yalnız ekip görür)
                </label>
                <div>
                  <Submit pendingText="Kaydediliyor…">Gönder</Submit>
                </div>
              </ActionForm>
            </div>
          )}
        </div>
        <div className="grid" style={{ alignContent: "start" }}>
          <Card title="Talep bilgisi">
            {write ? (
              <ActionForm action={staffUpdateTicketAction} resetOnOk={false}>
                <input type="hidden" name="id" value={t.id} />
                <div className="field">
                  <label htmlFor="status">Durum</label>
                  <select id="status" name="status" defaultValue={t.status}>
                    {Object.entries(TICKET_STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="priority">Öncelik</label>
                  <select id="priority" name="priority" defaultValue={t.priority}>
                    {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="assigneeId">Atanan</label>
                  <select id="assigneeId" name="assigneeId" defaultValue={t.assigneeId ?? ""}>
                    <option value="">Atanmadı</option>
                    {staff.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Submit className="btn btn-o" pendingText="…">
                    Kaydet
                  </Submit>
                </div>
              </ActionForm>
            ) : (
              <dl className="kv">
                <dt>Öncelik</dt>
                <dd>{PRIORITY_LABEL[t.priority]}</dd>
                <dt>Atanan</dt>
                <dd>{t.assigneeId ? (t.names[t.assigneeId] ?? "—") : "Atanmadı"}</dd>
              </dl>
            )}
          </Card>
          <Card title="Kısayollar">
            <ul className="ls">
              <li>
                <div className="ls-main">
                  <Link href={`/admin/musteriler/${t.tenantId}`}>Müşteri özeti</Link>
                </div>
              </li>
              <li>
                <div className="ls-main">
                  <Link href={`/admin/musteriler/${t.tenantId}?sekme=belgeler`}>Belgeler</Link>
                </div>
              </li>
              <li>
                <div className="ls-main">
                  <Link href={`/admin/musteriler/${t.tenantId}?sekme=operasyon`}>Görevler</Link>
                </div>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
