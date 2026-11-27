import Link from "next/link";
import { can } from "@avrupadasat/core/roles";
import { fmtDate } from "@/components/AppShell";
import { TICKET_TONE } from "@/components/panel/tones";
import { Badge, Card, PageHeader, WorkBadge } from "@/components/panel/ui";
import { nowMs } from "@/server/clock";
import { TAX_KIND_LABEL } from "@/server/company";
import { db } from "@/server/db";
import { DOC_KIND_LABEL } from "@/server/documents";
import { requireStaff } from "@/server/session";
import { TICKET_STATUS_LABEL } from "@/server/tickets";

export const metadata = { title: "Ekip paneli" };

const none = <T,>(): Promise<T[]> => Promise.resolve([]);
const zero = () => Promise.resolve(0);

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const s = await requireStaff();
  const sp = await searchParams;
  const r = s.actor.role;
  const me = s.actor.userId;
  const p = db();
  const now = new Date(nowMs());
  const partnerScope =
    r === "PARTNER" ? { tenantId: { in: [...(s.actor.partnerTenantIds ?? [])] } } : {};
  const [
    myTasks,
    openTickets,
    pendingDocs,
    overdueFilings,
    newLeads,
    onboarding,
    orderQueue,
    returnsToCheck,
    failedEvents,
    taskList,
    ticketList,
    docList,
    filingList,
  ] = await Promise.all([
    can(r, "task.read")
      ? p.task.count({ where: { assigneeId: me, status: { not: "COMPLETED" } } })
      : zero(),
    can(r, "ticket.read")
      ? p.ticket.count({ where: { status: { in: ["OPEN", "WAITING_TEAM"] } } })
      : zero(),
    can(r, "document.review") ? p.document.count({ where: { review: "PENDING" } }) : zero(),
    can(r, "tax.read")
      ? p.taxFiling.count({ where: { status: { not: "COMPLETED" }, dueAt: { lt: now } } })
      : zero(),
    can(r, "lead.read") ? p.lead.count({ where: { status: "NEW" } }) : zero(),
    can(r, "tenant.read") && r !== "PARTNER"
      ? p.tenant.count({ where: { status: "ONBOARDING" } })
      : zero(),
    can(r, "order.read")
      ? p.order.count({ where: { ...partnerScope, status: { in: ["ALLOCATED", "ON_HOLD"] } } })
      : zero(),
    can(r, "order.read")
      ? p.returnItem.count({ where: { ...partnerScope, status: "RECEIVED" } })
      : zero(),
    can(r, "audit.read")
      ? p.outboxEvent.count({ where: { processedAt: null, attempts: { gte: 5 } } })
      : zero(),
    can(r, "task.read")
      ? p.task.findMany({
          where: { assigneeId: me, status: { not: "COMPLETED" } },
          include: { tenant: { select: { name: true } } },
          orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }],
          take: 6,
        })
      : none<never>(),
    can(r, "ticket.read")
      ? p.ticket.findMany({
          where: { status: { in: ["OPEN", "WAITING_TEAM"] } },
          include: { tenant: { select: { name: true } } },
          orderBy: { lastActivity: "asc" },
          take: 6,
        })
      : none<never>(),
    can(r, "document.review")
      ? p.document.findMany({
          where: { review: "PENDING" },
          include: { tenant: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
          take: 6,
        })
      : none<never>(),
    can(r, "tax.read")
      ? p.taxFiling.findMany({
          where: { status: { not: "COMPLETED" } },
          include: { tenant: { select: { name: true } } },
          orderBy: { dueAt: "asc" },
          take: 6,
        })
      : none<never>(),
  ]);
  const stats = [
    can(r, "task.read") && { l: "Görevlerim", v: myTasks, href: "/admin/gorevler" },
    can(r, "ticket.read") && { l: "Yanıt bekleyen destek", v: openTickets, href: "/admin/destek" },
    can(r, "document.review") && {
      l: "Onay bekleyen belge",
      v: pendingDocs,
      href: "/admin/belgeler",
    },
    can(r, "tax.read") && { l: "Süresi geçen beyan", v: overdueFilings, href: "/admin/vergi" },
    can(r, "lead.read") && { l: "Yeni başvuru", v: newLeads, href: "/admin/talepler?durum=NEW" },
    can(r, "tenant.read") &&
      r !== "PARTNER" && { l: "Kuruluştaki firma", v: onboarding, href: "/admin/sirket-islemleri" },
    can(r, "order.read") && { l: "Sipariş kuyruğu", v: orderQueue, href: "/admin/siparisler" },
    can(r, "order.read") && {
      l: "Kontrol bekleyen iade",
      v: returnsToCheck,
      href: "/admin/iadeler",
    },
    can(r, "audit.read") &&
      failedEvents > 0 && { l: "Başarısız olay", v: failedEvents, href: "/admin/ayarlar" },
  ].filter(Boolean) as { l: string; v: number; href: string }[];
  return (
    <>
      <PageHeader title={`Merhaba, ${s.name.split(" ")[0]}`} desc={fmtDate(now)} />
      {sp.hata === "yetki" && (
        <p className="alert-err" role="alert" style={{ marginBottom: 16 }}>
          Bu sayfa için yetkiniz yok.
        </p>
      )}
      <div className="stats">
        {stats.map((x) => (
          <Link
            key={x.l}
            href={x.href}
            className="st"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="st-l">{x.l}</div>
            <div
              className="st-v"
              style={x.l === "Başarısız olay" ? { color: "#c2352b" } : undefined}
            >
              {x.v}
            </div>
          </Link>
        ))}
      </div>
      <div className="grid grid-2">
        {can(r, "task.read") && (
          <Card title="Size atanan görevler" action={<Link href="/admin/gorevler">Tümü</Link>}>
            {taskList.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Açık göreviniz yok.
              </p>
            ) : (
              <ul className="ls">
                {taskList.map((t) => (
                  <li key={t.id}>
                    <div className="ls-main">
                      <Link
                        href={`/admin/gorevler?id=${t.id}&atanan=herkes&durum=tumu&q=${encodeURIComponent(t.title)}`}
                      >
                        {t.title}
                      </Link>
                      <small>
                        {t.tenant.name}
                        {t.dueAt && ` · ${fmtDate(t.dueAt)}`}
                        {t.dueAt && t.dueAt < now && " · gecikti"}
                      </small>
                    </div>
                    <WorkBadge status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
        {can(r, "ticket.read") && (
          <Card
            title="Yanıt bekleyen destek talepleri"
            action={<Link href="/admin/destek">Tümü</Link>}
          >
            {ticketList.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Yanıt bekleyen talep yok.
              </p>
            ) : (
              <ul className="ls">
                {ticketList.map((t) => (
                  <li key={t.id}>
                    <div className="ls-main">
                      <Link href={`/admin/destek/${t.id}`}>
                        #{t.number} {t.subject}
                      </Link>
                      <small>
                        {t.tenant.name} · {fmtDate(t.lastActivity, true)}
                      </small>
                    </div>
                    <Badge tone={TICKET_TONE[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
        {can(r, "document.review") && (
          <Card title="Onay bekleyen belgeler" action={<Link href="/admin/belgeler">Tümü</Link>}>
            {docList.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Onay bekleyen belge yok.
              </p>
            ) : (
              <ul className="ls">
                {docList.map((d) => (
                  <li key={d.id}>
                    <div className="ls-main">
                      <Link href={`/admin/belgeler?q=${encodeURIComponent(d.filename)}`}>
                        {d.filename}
                      </Link>
                      <small>
                        {d.tenant.name} · {DOC_KIND_LABEL[d.kind]} · {fmtDate(d.createdAt)}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
        {can(r, "tax.read") && (
          <Card title="Yaklaşan beyanlar" action={<Link href="/admin/vergi">Tümü</Link>}>
            {filingList.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Takvimde açık beyan yok.
              </p>
            ) : (
              <ul className="ls">
                {filingList.map((f) => (
                  <li key={f.id}>
                    <div className="ls-main">
                      <Link href={`/admin/musteriler/${f.tenantId}?sekme=sirket`}>
                        {TAX_KIND_LABEL[f.kind] ?? f.kind} · {f.period}
                      </Link>
                      <small>
                        {f.tenant.name} · son tarih {fmtDate(f.dueAt)}
                      </small>
                    </div>
                    {f.dueAt < now ? (
                      <Badge tone="red">Geçti</Badge>
                    ) : (
                      <WorkBadge status={f.status} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
