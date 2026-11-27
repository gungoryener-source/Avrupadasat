import { ActionForm, FieldError } from "@/components/panel/ActionForm";
import { PageHeader } from "@/components/panel/ui";
import { Submit } from "@/components/Submit";
import { requireClient } from "@/server/session";
import { PRIORITY_LABEL, TICKET_CATEGORIES } from "@/server/tickets";
import { createTicketAction } from "../../portal-actions";

export const metadata = { title: "Yeni destek talebi" };

export default async function NewTicket({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; konu?: string }>;
}) {
  await requireClient("ticket.write");
  const q = await searchParams;
  return (
    <>
      <PageHeader
        title="Yeni destek talebi"
        crumbs={[{ href: "/panel/destek", label: "Destek Merkezi" }]}
      />
      <div className="pc" style={{ maxWidth: 760 }}>
        <ActionForm action={createTicketAction} encType="multipart/form-data" resetOnOk={false}>
          <div className="field">
            <label htmlFor="subject">Konu</label>
            <input id="subject" name="subject" defaultValue={q.konu} maxLength={160} required />
            <FieldError name="subject" />
          </div>
          <div className="row2">
            <div className="field">
              <label htmlFor="category">Kategori</label>
              <select
                id="category"
                name="category"
                defaultValue={q.kategori && q.kategori in TICKET_CATEGORIES ? q.kategori : "GENEL"}
              >
                {Object.entries(TICKET_CATEGORIES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="priority">Öncelik</label>
              <select id="priority" name="priority" defaultValue="NORMAL">
                {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="body">Mesajınız</label>
            <textarea id="body" name="body" rows={7} required />
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
            <span className="hint">
              PDF, JPG, PNG, XLSX, DOCX, CSV · en fazla 10 MB. Ek, Belgelerim&apos;e de kaydedilir.
            </span>
          </div>
          <div>
            <Submit pendingText="Gönderiliyor…">Talebi gönder</Submit>
          </div>
        </ActionForm>
      </div>
    </>
  );
}
