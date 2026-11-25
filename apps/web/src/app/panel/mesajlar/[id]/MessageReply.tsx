"use client";
import { useActionState } from "react";
import { Submit } from "@/components/Submit";
import { draftAction, sendAction, type MsgState } from "./actions";

export function MessageReply({
  id,
  status,
  draftDe,
  draftTr,
  canWrite,
  sentAt,
}: {
  id: string;
  status: string;
  draftDe: string;
  draftTr: string;
  canWrite: boolean;
  sentAt: string | null;
}) {
  const [dState, draft] = useActionState(draftAction, undefined as MsgState);
  const [sState, send] = useActionState(sendAction, undefined as MsgState);
  if (status === "SENT") {
    return (
      <div className="card" style={{ marginTop: 18 }}>
        <p className="alert-ok">Yanıt {sentAt} tarihinde gönderildi.</p>
        <p style={{ whiteSpace: "pre-wrap" }} lang="de">
          {draftDe}
        </p>
      </div>
    );
  }
  if (!canWrite) return null;
  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2 style={{ marginTop: 0, fontSize: 17 }}>Yanıt</h2>
      {!draftDe ? (
        <form action={draft}>
          <input type="hidden" name="id" value={id} />
          {dState?.error && <p className="alert-err">{dState.error}</p>}
          <Submit pendingText="Taslak hazırlanıyor…">Yapay zekâ ile taslak hazırla</Submit>
        </form>
      ) : (
        <form action={send} className="form">
          <input type="hidden" name="id" value={id} />
          {sState?.error && <p className="alert-err">{sState.error}</p>}
          <div className="g2">
            <div className="field">
              <label htmlFor="final">Gönderilecek yanıt (Almanca, düzenleyebilirsiniz)</label>
              <textarea id="final" name="final" rows={9} defaultValue={draftDe} lang="de" />
            </div>
            <div className="field">
              <label>Taslağın Türkçesi (bilgi için)</label>
              <p className="muted" style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>
                {draftTr}
              </p>
            </div>
          </div>
          <label className="check">
            <input type="checkbox" name="confirm" required />{" "}
            <span>Yanıtı okudum ve gönderilmesini onaylıyorum.</span>
          </label>
          <Submit pendingText="Gönderiliyor…">Onayla ve gönder</Submit>
        </form>
      )}
    </div>
  );
}
