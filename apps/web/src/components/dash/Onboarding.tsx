"use client";
/**
 * Hazırlık kontrol listesi: segmentli ilerleme halkası, adımlar, sıradaki adım için CTA.
 * Tümü bitince kısa bir kutlama gösterir ve kapatılabilir (tarayıcıda hatırlanır).
 */
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { IconCheck, IconClose } from "@/components/site/Icons";

type Step = { id: string; title: string; done: boolean; href: string; minutes: number };

const KEY = "avs:onboarding-dismissed";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}
function readDismissed(tenantId: string) {
  try {
    return localStorage.getItem(`${KEY}:${tenantId}`) === "1";
  } catch {
    return false; // depolama kapalı olabilir
  }
}

export type OnbStrings = {
  title: string;
  done: string;
  doneText: string;
  left: string; // {n} {m}
  cont: string;
  close: string;
  min: string; // {m}
  completed: string;
};

const TR: OnbStrings = {
  title: "Satışa hazırlık",
  done: "Hazırlık tamamlandı",
  doneText: "Tüm hazırlık adımlarını tamamladınız. Satış ve sevkiyat takibine geçebilirsiniz.",
  left: "{n} adım kaldı · tahmini {m} dakika",
  cont: "Devam et",
  close: "Hazırlık kartını kapat",
  min: "≈{m} dk",
  completed: "tamamlandı",
};

export function Onboarding({
  steps,
  tenantId,
  s: str = TR,
}: {
  steps: Step[];
  tenantId: string;
  s?: OnbStrings;
}) {
  const done = steps.filter((s) => s.done).length;
  const all = done === steps.length;
  const [closed, setDismissed] = useState(false);
  const stored = useSyncExternalStore(
    subscribe,
    () => readDismissed(tenantId),
    () => false,
  );
  if (all && (closed || stored)) return null;
  const next = steps.find((s) => !s.done);
  const left = steps.filter((s) => !s.done).reduce((a, s) => a + s.minutes, 0);
  const R = 26;
  const C = 2 * Math.PI * R;
  const seg = C / steps.length;
  return (
    <section className={`onb ${all ? "is-complete" : ""}`} aria-labelledby="onb-h">
      <div className="onb-ring" aria-hidden="true">
        <svg width="64" height="64" viewBox="0 0 64 64">
          {steps.map((s, i) => (
            <circle
              key={s.id}
              cx="32"
              cy="32"
              r={R}
              className={s.done ? "onb-seg is-on" : "onb-seg"}
              strokeDasharray={`${seg - 3} ${C - seg + 3}`}
              strokeDashoffset={-i * seg}
              transform="rotate(-90 32 32)"
            />
          ))}
        </svg>
        <span className="onb-num">
          {done}/{steps.length}
        </span>
      </div>
      <div className="onb-main">
        <h2 id="onb-h" className="onb-h">
          {all ? str.done : str.title}
        </h2>
        <p className="onb-sub">
          {all
            ? str.doneText
            : str.left.replace("{n}", String(steps.length - done)).replace("{m}", String(left))}
        </p>
        {!all && (
          <ol className="onb-list">
            {steps.map((s) => (
              <li key={s.id} className={s.done ? "is-done" : s === next ? "is-next" : ""}>
                <span className="onb-check" aria-hidden="true">
                  {s.done && <IconCheck size={12} />}
                </span>
                <Link href={s.href}>{s.title}</Link>
                <span className="sr-only">{s.done ? ` (${str.completed})` : ""}</span>
                {!s.done && (
                  <span className="onb-min">{str.min.replace("{m}", String(s.minutes))}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="onb-cta">
        {next ? (
          <Link href={next.href} className="btn">
            {str.cont}
          </Link>
        ) : (
          <button
            type="button"
            className="icon-btn"
            aria-label={str.close}
            onClick={() => {
              try {
                localStorage.setItem(`${KEY}:${tenantId}`, "1");
              } catch {
                /* yok say */
              }
              setDismissed(true);
            }}
          >
            <IconClose size={16} />
          </button>
        )}
      </div>
    </section>
  );
}
