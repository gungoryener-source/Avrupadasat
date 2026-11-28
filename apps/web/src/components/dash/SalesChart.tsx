"use client";
/**
 * Ciro alan grafiği (yığılmış, kanal bazında). Bağımlılıksız SVG.
 * Fare/dokunma ile ipucu; klavyeyle ← → gezilir. Kanal serileri açılıp kapatılabilir.
 */
import { useMemo, useState } from "react";

type Bucket = { d: string; total: number; byChannel: Record<string, number> };

const NAME: Record<string, string> = {
  AMAZON: "Amazon.de",
  EBAY: "eBay.de",
  WEBSHOP: "Shopify",
  MANUAL: "Manuel",
};
const COLOR: Record<string, string> = {
  AMAZON: "var(--chart-1)",
  EBAY: "var(--chart-2)",
  WEBSHOP: "var(--chart-3)",
  MANUAL: "var(--chart-4)",
};
const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const day = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" });

const W = 720;
const H = 220;
const PAD = { l: 8, r: 8, t: 12, b: 26 };

export function SalesChart({ buckets, channels }: { buckets: Bucket[]; channels: string[] }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [idx, setIdx] = useState<number | null>(null);
  const shown = channels.filter((c) => !hidden.includes(c));
  const n = buckets.length;
  const { stacks, max } = useMemo(() => {
    const stacks = buckets.map((b) => {
      let acc = 0;
      return shown.map((c) => {
        const y0 = acc;
        acc += b.byChannel[c] ?? 0;
        return [y0, acc] as const;
      });
    });
    const max = Math.max(1, ...stacks.map((s) => s.at(-1)?.[1] ?? 0));
    return { stacks, max };
  }, [buckets, shown]);
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / Math.max(1, n - 1);
  const y = (v: number) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b);
  const paths = shown.map((c, k) => {
    const top = stacks.map((s, i) => `${x(i).toFixed(1)},${y(s[k]![1]).toFixed(1)}`);
    const bottom = stacks.map((s, i) => `${x(i).toFixed(1)},${y(s[k]![0]).toFixed(1)}`).reverse();
    return { c, area: `M${top.join(" L")} L${bottom.join(" L")} Z`, line: `M${top.join(" L")}` };
  });
  const ticks = [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const total = buckets.reduce(
    (a, b) => a + shown.reduce((s, c) => s + (b.byChannel[c] ?? 0), 0),
    0,
  );
  const peak = buckets.reduce(
    (best, b, i) => (b.total > (buckets[best]?.total ?? 0) ? i : best),
    0,
  );
  const summary = `Son ${n} günde ${eur.format(total / 100)} ciro. En yüksek gün ${day.format(new Date(buckets[peak]!.d))}: ${eur.format(buckets[peak]!.total / 100)}.`;
  const cur = idx !== null ? buckets[idx] : null;

  function pick(clientX: number, el: SVGSVGElement) {
    const r = el.getBoundingClientRect();
    const rel = ((clientX - r.left) / r.width) * W;
    const i = Math.round(((rel - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1));
    setIdx(Math.max(0, Math.min(n - 1, i)));
  }

  return (
    <div className="chart">
      <div className="chart-legend" role="group" aria-label="Kanal serileri">
        {channels.map((c) => {
          const on = !hidden.includes(c);
          return (
            <button
              key={c}
              type="button"
              className="legend-btn"
              aria-pressed={on}
              onClick={() => setHidden((h) => (on ? [...h, c] : h.filter((x) => x !== c)))}
            >
              <span
                className="legend-sw"
                style={{ background: on ? COLOR[c] : "transparent", borderColor: COLOR[c] }}
              />
              {NAME[c] ?? c}
            </button>
          );
        })}
      </div>
      <div className="chart-box">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="chart-svg"
          role="img"
          aria-label={summary}
          tabIndex={0}
          onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
          onPointerLeave={() => setIdx(null)}
          onBlur={() => setIdx(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setIdx((i) => Math.min(n - 1, (i ?? -1) + 1));
            if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, (i ?? n) - 1));
          }}
        >
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(max * f)}
              y2={y(max * f)}
              className="chart-grid"
            />
          ))}
          <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="chart-axis" />
          {paths.map((p) => (
            <g key={p.c}>
              <path d={p.area} fill={COLOR[p.c]} className="chart-area" />
              <path d={p.line} stroke={COLOR[p.c]} className="chart-line" />
            </g>
          ))}
          {ticks.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={H - 6}
              className="chart-tick"
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            >
              {day.format(new Date(buckets[i]!.d))}
            </text>
          ))}
          {idx !== null && (
            <line x1={x(idx)} x2={x(idx)} y1={PAD.t} y2={y(0)} className="chart-cursor" />
          )}
        </svg>
        {cur && idx !== null && (
          <div
            className="chart-tip"
            style={{ left: `${(x(idx) / W) * 100}%` }}
            role="status"
            aria-live="polite"
          >
            <b>{day.format(new Date(cur.d))}</b>
            <span className="chart-tip-total">
              {eur.format(shown.reduce((s, c) => s + (cur.byChannel[c] ?? 0), 0) / 100)}
            </span>
            {shown.map((c) => (
              <span key={c} className="chart-tip-row">
                <span
                  className="legend-sw"
                  style={{ background: COLOR[c], borderColor: COLOR[c] }}
                />
                {NAME[c]} <b>{eur.format((cur.byChannel[c] ?? 0) / 100)}</b>
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="sr-only">{summary}</p>
    </div>
  );
}
