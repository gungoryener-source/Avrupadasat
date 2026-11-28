/** Para, sayı, tarih ve göreli zaman biçimleri (Intl). € tutarlar her dilde de-DE düzeninde. */
import { INTL_LOCALE, type Locale } from "@/i18n/dict";

const eur0 = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const eur2 = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function formatter(locale: Locale = "tr") {
  const L = INTL_LOCALE[locale];
  const num = new Intl.NumberFormat(L);
  const date = new Intl.DateTimeFormat(L, { day: "2-digit", month: "2-digit", year: "numeric" });
  const dayMonth = new Intl.DateTimeFormat(L, { day: "numeric", month: "short" });
  const rtf = new Intl.RelativeTimeFormat(L, { numeric: "always" });
  const NOW: Record<Locale, [string, string]> = {
    tr: ["az önce", "birazdan"],
    de: ["gerade eben", "gleich"],
    en: ["just now", "shortly"],
  };
  const nowWords = NOW[locale];
  return {
    eur: (cents: number, decimals = false) => (decimals ? eur2 : eur0).format(cents / 100),
    num: (n: number) => num.format(n),
    day: (d: Date) => date.format(d),
    dayMonth: (d: Date) => dayMonth.format(d),
    relative(d: Date, now: number): string {
      const s = Math.round((d.getTime() - now) / 1000);
      const a = Math.abs(s);
      if (a < 60) return s <= 0 ? nowWords[0] : nowWords[1];
      if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
      if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
      if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
      return date.format(d);
    },
  };
}

const trf = formatter("tr");
export const fmtEur = trf.eur;
export const fmtNum = trf.num;
export const fmtDay = trf.day;
export const fmtDayMonth = trf.dayMonth;
export const fmtRelative = trf.relative;

/** Okunur kısa sipariş no: kısa olanlar aynen; uzunlar son 9 karakter (tam no ipucu + kopyala ile) */
export function shortId(id: string): string {
  return id.length <= 14 ? id : `…${id.slice(-9)}`;
}
