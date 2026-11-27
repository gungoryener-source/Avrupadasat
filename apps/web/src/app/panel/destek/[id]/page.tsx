import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtDate } from "@/components/AppShell";
import { ActionForm, FieldError } from "@/components/panel/ActionForm";
import { Badge, PageHeader } from "@/components/panel/ui";
import { Submit } from "@/components/Submit";
import { db } from "@/server/db";
import { signDownload } from "@/server/files";
import { requireClient } from "@/server/session";
import {
  PRIORITY_LABEL,
  TICKET_CATEGORIES,
  TICKET_STATUS_LABEL,
  getTicket,
} from "@/server/tickets";
import { replyTicketAction } from "../../portal-actions";

export const metadata = { title: "Destek talebi" };

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ yeni?: string }>;
}) {
  const s = await requireClient("ticket.read");
  const { id } = await params;
  const { yeni } = await searchParams;
  // Başka firmanın talebi ve iç notlar sunucu tarafında elenir
  const t = await getTicket(s.actor, id);
  if (!t) notFound();
  const docIds = t.messages.map((m) => m.documentId).filter(Boolean) as string[];
  const docs = docIds.length
    ? await db().document.findMany({
        where: { id: { in: docIds }, tenantId: s.actor.tenantId },
        select: { id: true, filename: true },
      })
    : [];
  const docName = Object.fromEntries(docs.map((d) => [d.id, d.filename]));
  return (
    <>
      <PageHeader
        title={`#${t.number} ${t.subject}`}
        crumbs={[{ href: "/panel/destek", label: "Destek Merkezi" }]}
        desc={
          <>
            {TICKET_CATEGORIES[t.category as keyof typeof TICKET_CATEGORIES] ?? t.category} ·{" "}
            {PRIORITY_LABEL[t.priority]} öncelik ·{" "}
            {t.assigneeId ? `İlgilenen: ${t.names[t.assigneeId] ?? "Ekip"}` : "Henüz atanmadı"}
          </>
        }
        actions={
          <Badge
            tone={
              t.status === "WAITING_CUSTOMER" ? "amber" : t.status === "RESOLVED" ? "green" : "blue"
            }
          >
            {TICKET_STATUS_LABEL[t.status]}
          </Badge>
        }
      />
      {yeni && (
        <p className="alert-ok" role="status" style={{ marginBottom: 16 }}>
          Talebiniz alındı. Yanıt geldiğinde bildirim ve e-posta alacaksınız.
        </p>
      )}
      <div className="thread">
        {t.messages.map((m) => (
          <article key={m.id} className={`msg${m.fromStaff ? "" : " msg-me"}`}>
            <div className="msg-h">
              <b>
                {m.fromStaff
                  ? `${t.names[m.authorId] ?? "Ekip"} · Destek`
                  : (t.names[m.authorId] ?? "Siz")}
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
      {t.status === "CLOSED" ? (
        <p className="muted" style={{ marginTop: 24 }}>
          Bu talep kapandı. Yeni bir konu için{" "}
          <Link href="/panel/destek/yeni">yeni talep açın</Link>.
        </p>
      ) : (
        <div className="pc" style={{ marginTop: 24, maxWidth: 760 }}>
          <ActionForm action={replyTicketAction} encType="multipart/form-data">
            <input type="hidden" name="id" value={t.id} />
            <div className="field">
              <label htmlFor="body">Yanıtınız</label>
              <textarea id="body" name="body" rows={4} required />
              <FieldError name="body" />
            </div>
            <div className="field">
              <label htmlFor="file">Ek dosya (isteğe bağlı)</label>
              <input
                id="file"
                name="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx,.csv"
              />
            </div>
            <div>
              <Submit pendingText="Gönderiliyor…">Gönder</Submit>
            </div>
          </ActionForm>
        </div>
      )}
    </>
  );
}
