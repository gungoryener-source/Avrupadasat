import Link from "next/link";
import { fmtDate } from "@/components/AppShell";
import { EmptyState, PageHeader, Pager, pageNum } from "@/components/panel/ui";
import { IconBell } from "@/components/site/Icons";
import { listNotifications } from "@/server/notifications";
import { requireClient } from "@/server/session";
import { readNotificationsAction } from "../portal-actions";

export const metadata = { title: "Bildirimler" };

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string }>;
}) {
  const s = await requireClient();
  const page = pageNum((await searchParams).sayfa);
  const size = 25;
  const { items, total } = await listNotifications(s.actor.userId, {
    take: size,
    skip: (page - 1) * size,
  });
  return (
    <>
      <PageHeader
        title="Bildirimler"
        actions={
          items.some((n) => !n.readAt) ? (
            <form action={readNotificationsAction}>
              <button className="btn btn-o" type="submit">
                Tümünü okundu yap
              </button>
            </form>
          ) : undefined
        }
      />
      <div className="pc">
        {items.length === 0 ? (
          <EmptyState
            icon={<IconBell size={20} />}
            title="Bildirim yok"
            text="Görev, belge, destek ve sipariş güncellemeleri burada görünür."
          />
        ) : (
          <ul className="ls">
            {items.map((n) => (
              <li key={n.id}>
                <span
                  className="ls-dot"
                  data-read={n.readAt ? "" : undefined}
                  aria-label={n.readAt ? "Okundu" : "Okunmadı"}
                />
                <div className="ls-main">
                  {n.href ? <Link href={n.href}>{n.title}</Link> : <b>{n.title}</b>}
                  {n.body && <small>{n.body}</small>}
                  <small>{fmtDate(n.createdAt, true)}</small>
                </div>
                {!n.readAt && (
                  <form action={readNotificationsAction}>
                    <input type="hidden" name="id" value={n.id} />
                    <button className="btn btn-o btn-sm" type="submit">
                      Okundu
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Pager page={page} pageSize={size} total={total} params={{}} />
    </>
  );
}
