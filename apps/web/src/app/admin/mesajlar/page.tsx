import { fmtDate } from "@/components/AppShell";
import { db } from "@/server/db";
import { CHANNEL_LABEL } from "@/server/labels-ops";
import { requireStaff } from "@/server/session";

export const metadata = { title: "Müşteri mesajları" };

/** İstek anı (sunucu bileşeni her istekte bir kez çalışır) */
function requestTime() {
  return Date.now();
}

/** Ekip görünümü: yanıt bekleyen alıcı mesajları (yanıtı müşteri firma onaylar) */
export default async function AdminMessages() {
  const s = await requireStaff("message.read");
  const scope =
    s.actor.role === "PARTNER" ? { tenantId: { in: [...(s.actor.partnerTenantIds ?? [])] } } : {};
  const msgs = await db().customerMessage.findMany({
    where: { ...scope, status: { in: ["NEW", "DRAFTED"] } },
    orderBy: { receivedAt: "asc" },
    take: 200,
  });
  const tenants = new Map(
    (
      await db().tenant.findMany({
        where: { id: { in: [...new Set(msgs.map((m) => m.tenantId))] } },
        select: { id: true, name: true },
      })
    ).map((t) => [t.id, t.name]),
  );
  const now = requestTime();
  const hours = (d: Date) => Math.round((now - d.getTime()) / 3600_000);
  return (
    <>
      <h1>Yanıt bekleyen mesajlar</h1>
      <table className="tbl">
        <thead>
          <tr>
            <th>Firma</th>
            <th>Kanal</th>
            <th>Konu</th>
            <th>Bekleme</th>
            <th>Alındı</th>
          </tr>
        </thead>
        <tbody>
          {msgs.map((m) => (
            <tr key={m.id}>
              <td>{tenants.get(m.tenantId)}</td>
              <td>{CHANNEL_LABEL[m.channel]}</td>
              <td>{m.subject}</td>
              <td>
                <span className={`tag ${hours(m.receivedAt) > 24 ? "red" : "warn"}`}>
                  {hours(m.receivedAt)} saat
                </span>
              </td>
              <td>{fmtDate(m.receivedAt, true)}</td>
            </tr>
          ))}
          {msgs.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                Bekleyen mesaj yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
