/** Sevkiyat yolculuğu: TR çıkış → Transit → Gümrük → DE depo kabul → Stoğa girdi */
import { IconCheck } from "@/components/site/Icons";
import { fmtDayMonth } from "./format";

type Step = { key: string; label: string; done: boolean; current: boolean; at: Date | null };

export function Timeline({ steps, label }: { steps: Step[]; label: string }) {
  return (
    <ol className="tl" aria-label={label}>
      {steps.map((s) => (
        <li
          key={s.key}
          className={`tl-step ${s.done ? "is-done" : ""} ${s.current ? "is-current" : ""}`}
          aria-current={s.current ? "step" : undefined}
        >
          <span className="tl-dot" aria-hidden="true">
            {s.done ? <IconCheck size={12} /> : null}
          </span>
          <span className="tl-label">{s.label}</span>
          <span className="tl-at">
            {s.done && s.at ? fmtDayMonth(s.at) : s.current ? "Şu an" : ""}
            <span className="sr-only">
              {s.done ? " tamamlandı" : s.current ? " sıradaki adım" : " bekliyor"}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
