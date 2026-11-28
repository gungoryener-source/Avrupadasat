import Link from "next/link";
import type { ReactNode } from "react";
import { IconTrendDown, IconTrendUp } from "@/components/site/Icons";
import { CountUp } from "./CountUp";
import { Sparkline } from "./Sparkline";

/**
 * KPI kartı: ikon, büyük rakam (tabular), önceki döneme göre değişim (ok + metin), sparkline.
 * Değişim yalnız renge dayanmaz: ok ikonu ve "+%12" metni birlikte gösterilir.
 */
export function StatCard({
  href,
  icon,
  label,
  value,
  format = "num",
  change,
  compareLabel = "önceki 30 güne göre",
  line,
  sub,
  invert = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  value: number;
  format?: "num" | "eur";
  change: number | null;
  compareLabel?: string;
  line?: number[];
  sub?: ReactNode;
  /** Artışın kötü olduğu metrikler için renkleri ters çevir */
  invert?: boolean;
}) {
  const noData = value === 0 && (change === 0 || change === null);
  const dir = change === null || change === 0 ? "flat" : change > 0 ? "up" : "down";
  const good = dir === "flat" ? null : (dir === "up") !== invert;
  return (
    <Link href={href} className="kpi">
      <div className="kpi-h">
        <span className="kpi-ic">{icon}</span>
        <span className="kpi-l">{label}</span>
      </div>
      <div className="kpi-v">
        <CountUp value={value} format={format} />
      </div>
      <div className="kpi-f">
        <span className={`kpi-ch ${good === null ? "" : good ? "is-good" : "is-bad"}`}>
          {dir === "up" && <IconTrendUp size={14} />}
          {dir === "down" && <IconTrendDown size={14} />}
          {noData
            ? "—"
            : change === null
              ? "yeni"
              : change > 0
                ? `+%${change}`
                : change < 0
                  ? `−%${Math.abs(change)}`
                  : "%0"}
          <span className="sr-only">
            {" "}
            {change === null ? "önceki dönemde veri yok" : compareLabel}
          </span>
        </span>
        <span className="kpi-cmp" aria-hidden="true">
          {change === null ? "önceki dönemde veri yok" : compareLabel}
        </span>
        {line && (
          <span className="kpi-sp">
            <Sparkline values={line} tone={good === false ? "err" : "accent"} />
          </span>
        )}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </Link>
  );
}
