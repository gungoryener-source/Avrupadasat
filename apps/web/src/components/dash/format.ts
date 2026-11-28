/** Para, tarih ve göreli zaman biçimleri (Intl; tr-TR arayüz, € tutarlar de-DE düzeninde) */
const eur0 = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const eur2 = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const num = new Intl.NumberFormat("tr-TR");
const date = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const dayMonth = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" });
const rtf = new Intl.RelativeTimeFormat("tr-TR", { numeric: "auto" });

export const fmtEur = (cents: number, decimals = false) =>
  (decimals ? eur2 : eur0).format(cents / 100);
export const fmtNum = (n: number) => num.format(n);
export const fmtDay = (d: Date) => date.format(d);
export const fmtDayMonth = (d: Date) => dayMonth.format(d);

export function fmtRelative(d: Date, now: number): string {
  const s = Math.round((d.getTime() - now) / 1000);
  const a = Math.abs(s);
  if (a < 60) return rtf.format(Math.round(s), "second");
  if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return date.format(d);
}

/** Okunur kısa sipariş no: 302-8812345-1234567 → …1234567; uzun ise ilk/son karakterler */
export function shortId(id: string): string {
  if (id.length <= 12) return id;
  const parts = id.split("-");
  const last = parts.at(-1) ?? id;
  return last.length >= 5 && last.length <= 10 ? `…${last}` : `${id.slice(0, 4)}…${id.slice(-5)}`;
}
