import Link from "next/link";
import { can } from "@avrupadasat/core/roles";
import { fmtDate } from "@/components/AppShell";
import { ActionForm, FieldError } from "@/components/panel/ActionForm";
import { TICKET_TONE } from "@/components/panel/tones";
import { Badge, Card, EmptyState } from "@/components/panel/ui";
import { Submit } from "@/components/Submit";
import {
  listTenantTickets,
  PRIORITY_LABEL,
  TICKET_CATEGORIES,
  TICKET_STATUS_LABEL,
} from "@/server/tickets";
import { staffCreateTicketAction } from "../../../portal-actions";
import type { TabCtx } from "./ctx";

export async function SupportTab({ tenantId, actor }: TabCtx) {
  const r = await listTenantTickets(tenantId, { pageSize: 50 });
  return (
    <div className="grid grid-main">
      <Card title="Destek talepleri" pad={r.total === 0}>
        {r.total === 0 ? (
          <EmptyState title="Talep yok" text="Müşteri talep açtığında burada görünür." />
        ) : (
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th>No</th>
                <th>Konu</th>
                <th>Öncelik</th>
                <th>Son hareket</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {r.items.map((t) => (
                <tr key={t.id}>
                  <td className="mono">#{t.number}</td>
                  <td>
                    <Link href={`/admin/destek/${t.id}`}>{t.subject}</Link>
                  </td>
                  <td data-l="Öncelik">{PRIORITY_LABEL[t.priority]}</td>
                  <td data-l="Son hareket">{fmtDate(t.lastActivity, true)}</td>
                  <td data-l="Durum">
                    <Badge tone={TICKET_TONE[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {can(actor.role, "ticket.write") && (
        <Card title="Müşteri adına talep aç">
          <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
            Telefon veya e-postayla gelen konuları kayda almak için. Müşteri talebi panelinde görür.
          </p>
          <ActionForm action={staffCreateTicketAction}>
            <input type="hidden" name="tenantId" value={tenantId} />
            <div className="field">
              <label htmlFor="st-subject">Konu</label>
              <input id="st-subject" name="subject" required maxLength={160} />
              <FieldError name="subject" />
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="st-cat">Kategori</label>
                <select id="st-cat" name="category" defaultValue="GENEL">
                  {Object.entries(TICKET_CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="st-pr">Öncelik</label>
                <select id="st-pr" name="priority" defaultValue="NORMAL">
                  {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="st-body">Mesaj (müşteri görür)</label>
              <textarea id="st-body" name="body" rows={4} required />
              <FieldError name="body" />
            </div>
            <div>
              <Submit pendingText="…">Talep aç</Submit>
            </div>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
