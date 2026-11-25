import { fmtDate } from "@/components/AppShell";
import { db } from "@/server/db";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Audit log" };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ eylem?: string }>;
}) {
  await requireStaff("audit.read");
  const { eylem } = await searchParams;
  const rows = await db().auditLog.findMany({
    where: eylem ? { action: { startsWith: eylem } } : {},
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  const userIds = [...new Set(rows.map((r) => r.actorUserId).filter(Boolean) as string[])];
  const users = new Map(
    (
      await db().user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true },
      })
    ).map((u) => [u.id, u.email]),
  );
  return (
    <>
      <h1>Audit log</h1>
      <form className="inline-form" style={{ marginBottom: 14 }}>
        <div className="field">
          <label htmlFor="eylem">Eylem öneki</label>
          <input
            id="eylem"
            name="eylem"
            defaultValue={eylem ?? ""}
            placeholder="auth., quote., data."
          />
        </div>
        <button className="btn btn-o btn-sm">Filtrele</button>
      </form>
      <table className="tbl">
        <thead>
          <tr>
            <th>Zaman</th>
            <th>Kullanıcı</th>
            <th>Eylem</th>
            <th>Kayıt</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{fmtDate(r.createdAt, true)}</td>
              <td>
                {r.actorUserId ? (users.get(r.actorUserId) ?? r.actorUserId) : "sistem/ziyaretçi"}
              </td>
              <td>
                <span
                  className={`tag ${r.action.includes("failed") || r.action.includes("locked") ? "red" : ""}`}
                >
                  {r.action}
                </span>
              </td>
              <td className="mono">
                {r.entity}
                {r.entityId ? `:${r.entityId.slice(-8)}` : ""}
              </td>
              <td className="mono">{r.ip ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
