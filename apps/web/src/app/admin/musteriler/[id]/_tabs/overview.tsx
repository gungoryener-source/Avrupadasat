import Link from "next/link";
import { can } from "@avrupadasat/core/roles";
import { forTenant } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { Badge, Card, Stat } from "@/components/panel/ui";
import { Submit } from "@/components/Submit";
import { nowMs } from "@/server/clock";
import { db } from "@/server/db";
import { STEP_LABEL, STEP_STATUS, TENANT_STATUS } from "@/server/labels";
import { resendInviteAction } from "../../../actions";
import { updateTenantStatusAction } from "../../../ops-actions";
import type { TabCtx } from "./ctx";

export async function OverviewTab({ tenantId, actor }: TabCtx) {
  const t = forTenant(db(), tenantId);
  const since = new Date(nowMs() - 30 * 86400_000);
  const [tenant, openTasks, openTickets, pendingDocs, skus, orders30, lastActivity] =
    await Promise.all([
      db().tenant.findUniqueOrThrow({
        where: { id: tenantId },
        include: {
          memberships: { include: { user: true } },
          contacts: true,
          registration: { orderBy: { step: "asc" } },
        },
      }),
      t.task.count({ where: { status: { not: "COMPLETED" } } }),
      t.ticket.count({ where: { status: { in: ["OPEN", "WAITING_TEAM", "WAITING_CUSTOMER"] } } }),
      t.document.count({ where: { review: "PENDING" } }),
      t.stockItem.count(),
      t.order.count({ where: { orderedAt: { gte: since } } }),
      db().auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      }),
    ]);
  const pendingInvites = await db().authToken.findMany({
    where: {
      userId: { in: tenant.memberships.map((m) => m.userId) },
      purpose: "INVITE",
      usedAt: null,
      expiresAt: { gt: new Date(nowMs()) },
    },
    select: { userId: true },
  });
  const done = tenant.registration.filter((r) => r.status === "TAMAM").length;
  const manage = can(actor.role, "tenant.manage");
  const base = `/admin/musteriler/${tenantId}`;
  return (
    <>
      <div className="stats">
        <Stat
          label="Açık görev"
          value={<Link href={`${base}?sekme=operasyon`}>{openTasks}</Link>}
        />
        <Stat
          label="Açık destek"
          value={<Link href={`${base}?sekme=destek`}>{openTickets}</Link>}
        />
        <Stat
          label="Onay bekleyen belge"
          value={<Link href={`${base}?sekme=belgeler`}>{pendingDocs}</Link>}
        />
        <Stat label="Ürün (SKU)" value={skus} />
        <Stat label="Sipariş (30 gün)" value={orders30} />
        <Stat
          label="Son hareket"
          value={
            <span style={{ fontSize: 15 }}>
              {lastActivity[0] ? fmtDate(lastActivity[0].createdAt, true) : "—"}
            </span>
          }
        />
      </div>
      <div className="grid grid-2">
        <Card
          title={`Kuruluş ve kayıt (${done}/${tenant.registration.length})`}
          action={<Link href={`${base}?sekme=sirket`}>Düzenle</Link>}
        >
          {tenant.registration.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Kuruluş adımı tanımlı değil.
            </p>
          ) : (
            <ul className="ls">
              {tenant.registration.map((r) => (
                <li key={r.id}>
                  <div className="ls-main">
                    <b>{STEP_LABEL[r.step]}</b>
                    {r.note && <small>{r.note}</small>}
                  </div>
                  <Badge
                    tone={
                      r.status === "TAMAM"
                        ? "green"
                        : r.status === "SORUN"
                          ? "red"
                          : r.status === "SURUYOR"
                            ? "blue"
                            : "neutral"
                    }
                  >
                    {STEP_STATUS[r.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="grid" style={{ alignContent: "start" }}>
          <Card title="Kullanıcılar">
            <ul className="ls">
              {tenant.memberships.map((m) => (
                <li key={m.id}>
                  <div className="ls-main">
                    <b>{m.user.name}</b>
                    <small>
                      {m.user.email} ·{" "}
                      {m.role === "CLIENT_OWNER" ? "Firma yöneticisi" : "Kullanıcı"}
                    </small>
                  </div>
                  {m.user.passwordHash ? (
                    <Badge tone="green">Aktif</Badge>
                  ) : (
                    <form action={resendInviteAction} className="row-actions">
                      <input type="hidden" name="userId" value={m.userId} />
                      <input type="hidden" name="tenantId" value={tenantId} />
                      <Badge tone="amber">
                        {pendingInvites.some((p) => p.userId === m.userId)
                          ? "Davet bekliyor"
                          : "Davet süresi doldu"}
                      </Badge>
                      <Submit className="btn btn-o btn-sm" pendingText="…">
                        Daveti yeniden gönder
                      </Submit>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Yetkililer">
            {tenant.contacts.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Kayıtlı yetkili yok.
              </p>
            ) : (
              <ul className="ls">
                {tenant.contacts.map((c) => (
                  <li key={c.id}>
                    <div className="ls-main">
                      <b>
                        {c.name} {c.isPrimary && <Badge tone="blue">Ana yetkili</Badge>}
                      </b>
                      <small>
                        {c.email} · {c.phone}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {manage && (
            <Card title="Firma durumu">
              <form action={updateTenantStatusAction} className="form row-actions">
                <input type="hidden" name="tenantId" value={tenantId} />
                <select name="status" defaultValue={tenant.status} aria-label="Firma durumu">
                  {Object.entries(TENANT_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <Submit className="btn btn-o btn-sm">Firma durumunu kaydet</Submit>
              </form>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
