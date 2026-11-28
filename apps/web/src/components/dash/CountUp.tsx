"use client";
/** Yüklemede sayıyı 0'dan hedefe sayar (≈600 ms). Hareket azaltma tercihinde doğrudan gösterir. */
import { useEffect, useRef, useState } from "react";

const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
export function CountUp({
  value,
  format = "num",
  locale = "tr-TR",
}: {
  value: number;
  format?: "num" | "eur";
  locale?: string;
}) {
  const num = new Intl.NumberFormat(locale);
  const target = format === "eur" ? value / 100 : value;
  const [shown, setShown] = useState(target);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || target === 0) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 600);
      setShown(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return <>{format === "eur" ? eur.format(shown) : num.format(shown)}</>;
}
