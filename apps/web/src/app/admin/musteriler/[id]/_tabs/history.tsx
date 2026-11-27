import { fmtDate } from "@/components/AppShell";
import { Card, EmptyState, Pager, pageNum } from "@/components/panel/ui";
import { AUDIT_LABEL } from "@/server/audit-labels";
import { db } from "@/server/db";
import type { TabCtx } from "./ctx";

/** Firma için denetim kaydı. Meta alanları (değerler) gösterilmez; yalnız eylem, kişi, zaman. */
export async function HistoryTab({ tenantId, q }: TabCtx) {
  const page = pageNum(q.sayfa);
  const size = 40;
  const [rows, total] = await Promise.all([
    db().auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: size,
      skip: (page - 1) * size,
    }),
    db().auditLog.count({ where: { tenantId } }),
  ]);
  const ids = [...new Set(rows.map((r) => r.actorUserId).filter(Boolean) as string[])];
  const users = await db().user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, staffRole: true },
  });
  const who = new Map(users.map((u) => [u.id, u]));
  return (
    <>
      <Card title="Etkinlik geçmişi" pad={rows.length === 0}>
        {rows.length === 0 ? (
          <EmptyState title="Kayıt yok" />
        ) : (
          <table className="tbl tbl-stack">
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Kişi</th>
                <th>Eylem</th>
                <th>Kayıt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const u = r.actorUserId ? who.get(r.actorUserId) : undefined;
                return (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.createdAt, true)}</td>
                    <td data-l="Kişi">
                      {u ? `${u.name}${u.staffRole ? " (ekip)" : ""}` : "Sistem"}
                    </td>
                    <td data-l="Eylem">{AUDIT_LABEL[r.action] ?? r.action}</td>
                    <td data-l="Kayıt" className="muted" style={{ fontSize: 12.5 }}>
                      {r.entity}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
      <Pager page={page} pageSize={size} total={total} params={{ sekme: "gecmis" }} />
    </>
  );
}
