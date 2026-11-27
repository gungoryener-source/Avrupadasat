import Link from "next/link";
import type { TicketStatus } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { Badge, EmptyState, PageHeader, Pager, Toolbar, pageNum, sp } from "@/components/panel/ui";
import { IconLifebuoy } from "@/components/site/Icons";
import { requireClient } from "@/server/session";
import {
  listTenantTickets,
  PRIORITY_LABEL,
  TICKET_CATEGORIES,
  TICKET_STATUS_LABEL,
} from "@/server/tickets";

export const metadata = { title: "Destek Merkezi" };

const TONE: Record<TicketStatus, "blue" | "amber" | "green" | "neutral"> = {
  OPEN: "blue",
  WAITING_TEAM: "blue",
  WAITING_CUSTOMER: "amber",
  RESOLVED: "green",
  CLOSED: "neutral",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await requireClient("ticket.read");
  const q = sp(await searchParams);
  const status = (Object.keys(TICKET_STATUS_LABEL) as TicketStatus[]).includes(
    q.durum as TicketStatus,
  )
    ? (q.durum as TicketStatus)
    : q.durum === "aktif"
      ? "ACTIVE"
      : undefined;
  const r = await listTenantTickets(s.actor.tenantId, { q: q.q, status, page: pageNum(q.sayfa) });
  return (
    <>
      <PageHeader
        title="Destek Merkezi"
        desc="Ekibimize soru sorun, belge iletin, değişiklik talep edin. Yanıtlar burada ve e-postanızda."
        actions={
          <Link href="/panel/destek/yeni" className="btn">
            Yeni talep
          </Link>
        }
      />
      <Toolbar
        q={q.q}
        placeholder="Konu veya talep no"
        filters={[
          {
            name: "durum",
            label: "Durum",
            value: q.durum,
            options: [
              { value: "aktif", label: "Açık talepler" },
              ...Object.entries(TICKET_STATUS_LABEL).map(([value, label]) => ({ value, label })),
            ],
          },
        ]}
      />
      {r.total === 0 ? (
        <div className="pc">
          <EmptyState
            icon={<IconLifebuoy size={20} />}
            title={q.q || q.durum ? "Sonuç yok" : "Henüz destek talebiniz yok"}
            text={
              q.q || q.durum
                ? "Filtreleri değiştirip tekrar deneyin."
                : "Bir sorunuz olduğunda talep açın; ilgili uzman size döner."
            }
            action={
              !q.q && !q.durum ? (
                <Link className="btn btn-sm" href="/panel/destek/yeni">
                  Talep aç
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="tw">
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th>No</th>
                <th>Konu</th>
                <th>Kategori</th>
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
                    <Link href={`/panel/destek/${t.id}`}>{t.subject}</Link>
                  </td>
                  <td data-l="Kategori">
                    {TICKET_CATEGORIES[t.category as keyof typeof TICKET_CATEGORIES] ?? t.category}
                  </td>
                  <td data-l="Öncelik">{PRIORITY_LABEL[t.priority]}</td>
                  <td data-l="Son hareket">{fmtDate(t.lastActivity, true)}</td>
                  <td>
                    <Badge tone={TONE[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager
        page={r.page}
        pageSize={r.pageSize}
        total={r.total}
        params={{ q: q.q, durum: q.durum }}
      />
    </>
  );
}
