/**
 * Hizmet seviyesi (SLA) ölçümü — Kapı 0 K0-3 taslağındaki hedefler.
 * Hedef değerler ÖNERİDİR (docs/kapi-0-karar-belgeleri.md); sözleşme onaylanınca burada güncellenir.
 * Saatler depo saat dilimine (Europe/Berlin) göre; iş günü Pazartesi–Cuma.
 * TODO(verify): Alman resmî tatilleri (eyalete göre) iş günü hesabına eklenecek.
 */
export const SLA_TARGETS = {
  /** Gümrükten çıkıştan mal kabule en fazla iş günü */
  inboundBusinessDays: 2,
  /** Bu saatten önce gelen sipariş aynı iş günü kargoya verilir */
  cutoffHour: 14,
  /** İade varışından kontrol ve kayda en fazla iş günü */
  returnsBusinessDays: 3,
  /** Zamanında gönderim hedef oranı (%) */
  onTimeTargetPct: 98,
} as const;

export const SLA_TZ = "Europe/Berlin";

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: SLA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

/** Berlin yerel takvim günü (YYYY-MM-DD), saat ve haftanın günü */
export function berlinParts(d: Date): { day: string; hour: number; weekday: number } {
  const p = Object.fromEntries(dayFmt.formatToParts(d).map((x) => [x.type, x.value]));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday!);
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), weekday: wd };
}

const isBusinessDay = (weekday: number) => weekday >= 1 && weekday <= 5;

/** YYYY-MM-DD'ye n takvim günü ekler (UTC aritmetiği; yalnız tarih) */
function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const weekdayOf = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();

/** day'den sonraki n'inci iş günü (n=0 → day iş günüyse day, değilse sonraki iş günü) */
export function nthBusinessDay(day: string, n: number): string {
  let d = day;
  while (!isBusinessDay(weekdayOf(d))) d = addDays(d, 1);
  for (let i = 0; i < n; i++) {
    d = addDays(d, 1);
    while (!isBusinessDay(weekdayOf(d))) d = addDays(d, 1);
  }
  return d;
}

/** a ile b arasındaki iş günü farkı (Berlin günleri; aynı gün = 0) */
export function businessDaysBetween(a: Date, b: Date): number {
  let from = berlinParts(a).day;
  const to = berlinParts(b).day;
  if (to <= from) return 0;
  let n = 0;
  while (from < to) {
    from = addDays(from, 1);
    if (isBusinessDay(weekdayOf(from))) n++;
  }
  return n;
}

/** Siparişin en geç kargoya verilmesi gereken Berlin günü */
export function shipDeadline(orderedAt: Date, cutoffHour: number = SLA_TARGETS.cutoffHour): string {
  const p = berlinParts(orderedAt);
  if (isBusinessDay(p.weekday) && p.hour < cutoffHour) return p.day;
  return nthBusinessDay(addDays(p.day, 1), 0);
}

export function isShippedOnTime(orderedAt: Date, shippedAt: Date): boolean {
  return berlinParts(shippedAt).day <= shipDeadline(orderedAt);
}

export interface SlaMetric {
  /** Ölçülen kayıt sayısı */
  count: number;
  /** Hedefi tutturan kayıt sayısı */
  met: number;
  /** Ortalama (iş günü) — yalnız süre ölçülerinde */
  avgDays: number | null;
  /** met/count yüzdesi; kayıt yoksa null */
  pct: number | null;
}

export function metric(durations: number[], target: number): SlaMetric {
  const met = durations.filter((d) => d <= target).length;
  return {
    count: durations.length,
    met,
    avgDays: durations.length
      ? Math.round((durations.reduce((s, d) => s + d, 0) / durations.length) * 10) / 10
      : null,
    pct: durations.length ? Math.round((met / durations.length) * 1000) / 10 : null,
  };
}
