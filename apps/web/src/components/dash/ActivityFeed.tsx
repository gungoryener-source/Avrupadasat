import Link from "next/link";
import type { FeedItem } from "@/server/dashboard";
import { IconBell, IconChecklist, IconClock, IconLifebuoy } from "@/components/site/Icons";
import { fmtDay, fmtRelative } from "./format";

const ICON = {
  task: IconChecklist,
  deadline: IconClock,
  ticket: IconLifebuoy,
  notification: IconBell,
  document: IconChecklist,
} as const;
const KIND = {
  task: "Görev",
  deadline: "Son tarih",
  ticket: "Destek",
  notification: "Bildirim",
  document: "Belge",
} as const;

export function ActivityFeed({ items, now }: { items: FeedItem[]; now: number }) {
  return (
    <ul className="feed">
      {items.map((i) => {
        const Ic = ICON[i.kind];
        const future = i.at.getTime() > now;
        return (
          <li
            key={i.id}
            className={`feed-i ${i.urgent ? "is-urgent" : ""} ${i.unread ? "is-unread" : ""}`}
          >
            <span className={`feed-ic feed-${i.kind}`} aria-hidden="true">
              <Ic size={15} />
            </span>
            <div className="feed-b">
              <Link href={i.href} className="feed-t">
                <span className="sr-only">{KIND[i.kind]}: </span>
                {i.title}
              </Link>
              <span className="feed-m">
                {i.detail && <>{i.detail} · </>}
                <time dateTime={i.at.toISOString()} title={fmtDay(i.at)}>
                  {future && i.kind !== "notification" ? fmtDay(i.at) : fmtRelative(i.at, now)}
                </time>
                {i.urgent && <span className="feed-flag">Yaklaşıyor</span>}
                {i.unread && <span className="sr-only"> (okunmadı)</span>}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
