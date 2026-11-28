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
  labels = { new: "yeni", noData: "henüz veri yok", noPrev: "önceki dönemde veri yok" },
  intlLocale = "tr-TR",
}: {
  labels?: { new: string; noData: string; noPrev: string };
  intlLocale?: string;
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
  const cmp = noData ? labels.noData : change === null ? labels.noPrev : compareLabel;
  return (
    <Link href={href} className="kpi">
      <div className="kpi-h">
        <span className="kpi-ic">{icon}</span>
        <span className="kpi-l">{label}</span>
      </div>
      <div className="kpi-v">
        <CountUp value={value} format={format} locale={intlLocale} />
      </div>
      <div className="kpi-f">
        <span className={`kpi-ch ${good === null ? "" : good ? "is-good" : "is-bad"}`}>
          {dir === "up" && <IconTrendUp size={14} />}
          {dir === "down" && <IconTrendDown size={14} />}
          {noData
            ? "—"
            : change === null
              ? labels.new
              : new Intl.NumberFormat(intlLocale, {
                  style: "percent",
                  signDisplay: "exceptZero",
                }).format(change / 100)}
          <span className="sr-only"> {cmp}</span>
        </span>
        <span className="kpi-cmp" aria-hidden="true">
          {cmp}
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
