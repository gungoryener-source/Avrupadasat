/** Sevkiyat yolculuğu: TR çıkış → Transit → Gümrük → DE depo kabul → Stoğa girdi */
import { IconCheck } from "@/components/site/Icons";
import { fmtDayMonth as defaultDayMonth } from "./format";

type Step = { key: string; label: string; done: boolean; current: boolean; at: Date | null };

export function Timeline({
  steps,
  label,
  words = { now: "Şu an", done: "tamamlandı", current: "sıradaki adım", waiting: "bekliyor" },
  fmtDayMonth = defaultDayMonth,
}: {
  steps: Step[];
  label: string;
  words?: { now: string; done: string; current: string; waiting: string };
  fmtDayMonth?: (d: Date) => string;
}) {
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
            {s.done && s.at ? fmtDayMonth(s.at) : s.current ? words.now : ""}
            <span className="sr-only">
              {" "}
              {s.done ? words.done : s.current ? words.current : words.waiting}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
