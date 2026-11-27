import Link from "next/link";
import type { TicketStatus } from "@avrupadasat/db";
import { TICKET_TONE } from "@/components/panel/tones";
import { fmtDate } from "@/components/AppShell";
import { Badge, EmptyState, PageHeader, Pager, Toolbar, pageNum, sp } from "@/components/panel/ui";
import { IconLifebuoy } from "@/components/site/Icons";
import { staffOptions } from "@/server/admin-data";
import { requireStaff } from "@/server/session";
import {
  listAllTickets,
  PRIORITY_LABEL,
  TICKET_CATEGORIES,
  TICKET_STATUS_LABEL,
} from "@/server/tickets";

export const metadata = { title: "Destek talepleri" };

export default async function AdminTickets({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await requireStaff("ticket.read");
  const q = sp(await searchParams);
  const status = (Object.keys(TICKET_STATUS_LABEL) as TicketStatus[]).includes(
    q.durum as TicketStatus,
  )
    ? (q.durum as TicketStatus)
    : q.durum === "tumu"
      ? undefined
      : "ACTIVE";
  const staff = await staffOptions();
  const assigneeId =
    q.atanan === "ben"
      ? s.actor.userId
      : staff.some((x) => x.value === q.atanan)
        ? q.atanan
        : undefined;
  const r = await listAllTickets({ q: q.q, status, assigneeId, page: pageNum(q.sayfa) });
  const names = Object.fromEntries(staff.map((x) => [x.value, x.label]));
  return (
    <>
      <PageHeader
        title="Destek talepleri"
        desc="Varsayılan görünüm açık talepler. İç notlar müşteriye hiçbir koşulda gösterilmez."
      />
      <Toolbar
        q={q.q}
        placeholder="Konu veya talep no"
        filters={[
          {
            name: "durum",
            label: "Durum",
            all: "Açık talepler",
            value: q.durum,
            options: [
              { value: "tumu", label: "Tüm durumlar" },
              ...Object.entries(TICKET_STATUS_LABEL).map(([value, label]) => ({ value, label })),
            ],
          },
          {
            name: "atanan",
            label: "Atanan",
            value: q.atanan,
            options: [{ value: "ben", label: "Bana atananlar" }, ...staff],
          },
        ]}
      />
      {r.total === 0 ? (
        <div className="pc">
          <EmptyState
            icon={<IconLifebuoy size={20} />}
            title="Talep yok"
            text={
              q.q || q.durum || q.atanan
                ? "Filtreleri değiştirip tekrar deneyin."
                : "Açık destek talebi bulunmuyor."
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
                <th>Firma</th>
                <th>Kategori</th>
                <th>Öncelik</th>
                <th>Atanan</th>
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
                  <td data-l="Firma">
                    <Link href={`/admin/musteriler/${t.tenantId}?sekme=destek`}>
                      {t.tenant.name}
                    </Link>
                  </td>
                  <td data-l="Kategori">
                    {TICKET_CATEGORIES[t.category as keyof typeof TICKET_CATEGORIES] ?? t.category}
                  </td>
                  <td data-l="Öncelik">
                    {t.priority === "URGENT" || t.priority === "HIGH" ? (
                      <Badge tone="red">{PRIORITY_LABEL[t.priority]}</Badge>
                    ) : (
                      PRIORITY_LABEL[t.priority]
                    )}
                  </td>
                  <td data-l="Atanan">
                    {t.assigneeId ? (
                      (names[t.assigneeId] ?? "—")
                    ) : (
                      <span className="muted">Atanmadı</span>
                    )}
                  </td>
                  <td data-l="Son hareket">{fmtDate(t.lastActivity, true)}</td>
                  <td>
                    <Badge tone={TICKET_TONE[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Badge>
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
        params={{ q: q.q, durum: q.durum, atanan: q.atanan }}
      />
    </>
  );
}
