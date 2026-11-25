import { fmtDate } from "@/components/AppShell";
import { STEP_LABEL, STEP_STATUS } from "@/server/labels";
import { registrationState, waitingList } from "@/server/panel";
import { requireClient } from "@/server/session";
import Link from "next/link";

export const metadata = { title: "Şirket kuruluşu" };

export default async function CompanyPage() {
  const s = await requireClient();
  const [reg, waiting] = await Promise.all([
    registrationState(s.actor.tenantId),
    waitingList(s.actor.tenantId),
  ]);
  return (
    <>
      <h1>Şirket kuruluşu ve kayıtlar</h1>
      <div className="g2">
        <div className="card">
          <ol className="steps">
            {reg.tasks.map((t) => (
              <li key={t.id}>
                <b>
                  {STEP_LABEL[t.step]}{" "}
                  <span
                    className={`tag ${t.status === "TAMAM" ? "ok" : t.status === "SORUN" ? "red" : t.status === "SURUYOR" ? "warn" : ""}`}
                  >
                    {STEP_STATUS[t.status]}
                  </span>
                </b>
                <span>
                  {t.note ?? ""} {t.status !== "BEKLIYOR" && `· ${fmtDate(t.updatedAt)}`}
                </span>
              </li>
            ))}
          </ol>
          {reg.tasks.length === 0 && <p className="muted">Kayıt adımı yok.</p>}
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: 19 }}>
            {reg.salesLocked ? "Numara beklerken" : "Kayıtlar tamam"}
          </h2>
          {reg.salesLocked ? (
            <p className="muted">
              Satış ve ödeme adımları{" "}
              <b>{reg.pendingUnlock.map((p) => STEP_LABEL[p.step]).join(" ve ")}</b> tamamlanınca
              açılır. Panelin geri kalanı şimdiden kullanılabilir:
            </p>
          ) : (
            <p className="alert-ok">Vergi kayıtlarınız tamamlandı; satış adımları açık.</p>
          )}
          <ul className="checklist">
            {waiting.map((w) => (
              <li key={w.id}>
                <span className={`tag ${w.done ? "ok" : "warn"}`}>
                  {w.done ? "Tamam" : "Yapılacak"}
                </span>{" "}
                <Link href={w.href}>{w.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
