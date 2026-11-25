import Link from "next/link";
import { notFound } from "next/navigation";
import { forTenant } from "@avrupadasat/db";
import { can } from "@avrupadasat/core/roles";
import { fmtDate } from "@/components/AppShell";
import { db } from "@/server/db";
import { requireClient } from "@/server/session";
import { MessageReply } from "./MessageReply";

export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireClient("message.read");
  const { id } = await params;
  const m = await forTenant(db(), s.actor.tenantId).customerMessage.findFirst({ where: { id } });
  if (!m) notFound();
  return (
    <>
      <p>
        <Link href="/panel/mesajlar">← Mesajlar</Link>
      </p>
      <h1>{m.subject}</h1>
      <p className="muted">
        {m.buyerName} · {fmtDate(m.receivedAt, true)} {m.orderRef && `· Sipariş ${m.orderRef}`}
      </p>
      <div className="g2">
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 17 }}>Alıcının mesajı (Almanca)</h2>
          <p style={{ whiteSpace: "pre-wrap" }} lang="de">
            {m.bodyDe}
          </p>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 17 }}>Türkçe çeviri</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{m.bodyTr}</p>
          <p className="muted" style={{ fontSize: 12 }}>
            Otomatik çeviri ({m.aiModel}). Önemli ayrıntıları orijinalden kontrol edin.
          </p>
        </div>
      </div>
      <MessageReply
        id={m.id}
        status={m.status}
        draftDe={m.draftDe ?? ""}
        draftTr={m.draftTr ?? ""}
        canWrite={can(s.actor.role, "message.write")}
        sentAt={m.sentAt ? fmtDate(m.sentAt, true) : null}
      />
    </>
  );
}
