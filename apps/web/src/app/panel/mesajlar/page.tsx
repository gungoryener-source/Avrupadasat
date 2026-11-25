import Link from "next/link";
import { revalidatePath } from "next/cache";
import { forTenant } from "@avrupadasat/db";
import { fmtDate } from "@/components/AppShell";
import { Submit } from "@/components/Submit";
import { db } from "@/server/db";
import { CHANNEL_LABEL } from "@/server/labels-ops";
import { fetchMessages } from "@/server/messages";
import { requireClient } from "@/server/session";

export const metadata = { title: "Müşteri mesajları" };

const STATUS = {
  NEW: ["Yeni", "red"],
  DRAFTED: ["Taslak hazır", "warn"],
  SENT: ["Yanıtlandı", "ok"],
  CLOSED: ["Kapandı", ""],
} as const;

async function fetchAction() {
  "use server";
  const s = await requireClient("message.read");
  await fetchMessages(s.actor.tenantId);
  revalidatePath("/panel/mesajlar");
}

export default async function MessagesPage() {
  const s = await requireClient("message.read");
  const msgs = await forTenant(db(), s.actor.tenantId).customerMessage.findMany({
    orderBy: { receivedAt: "desc" },
    take: 200,
  });
  return (
    <>
      <h1>Müşteri mesajları</h1>
      <p className="muted">
        Almanca alıcı mesajları Türkçe çevirisiyle gelir; yapay zekâ bir yanıt taslağı hazırlar.{" "}
        <b>Hiçbir yanıt sizin onayınız olmadan gönderilmez.</b>
      </p>
      <form action={fetchAction} style={{ marginBottom: 14 }}>
        <Submit className="btn btn-o btn-sm" pendingText="Çekiliyor…">
          Yeni mesajları çek
        </Submit>
      </form>
      <table className="tbl">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Kanal</th>
            <th>Konu</th>
            <th>Türkçe özet</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          {msgs.map((m) => (
            <tr key={m.id}>
              <td>{fmtDate(m.receivedAt, true)}</td>
              <td>{CHANNEL_LABEL[m.channel]}</td>
              <td>
                <Link href={`/panel/mesajlar/${m.id}`}>{m.subject}</Link>
              </td>
              <td className="muted" style={{ fontSize: 13 }}>
                {(m.bodyTr ?? "").slice(0, 90)}
              </td>
              <td>
                <span className={`tag ${STATUS[m.status][1]}`}>{STATUS[m.status][0]}</span>
              </td>
            </tr>
          ))}
          {msgs.length === 0 && (
            <tr>
              <td colSpan={5} className="muted">
                Mesaj yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
