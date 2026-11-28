/**
 * Taşıyıcı takip bağlantıları. Taşıyıcının kendi sorgu sayfasına yönlendirir; API entegrasyonu
 * değildir (durumu otomatik çekmez). Bilinmeyen taşıyıcıda (ör. parsiyel nakliyeci) bağlantı yok.
 */
const LINKS: Record<string, (n: string) => string> = {
  DHL: (n) =>
    `https://www.dhl.com/de-de/home/tracking/tracking-parcel.html?submit=1&tracking-id=${n}`,
  DPD: (n) => `https://tracking.dpd.de/status/de_DE/parcel/${n}`,
  GLS: (n) => `https://gls-group.com/DE/de/paketverfolgung?match=${n}`,
  UPS: (n) => `https://www.ups.com/track?tracknum=${n}`,
  HERMES: (n) => `https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation#${n}`,
  FEDEX: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
};

export const KNOWN_CARRIERS = ["DHL", "DPD", "GLS", "UPS", "Hermes", "FedEx"];

export function trackingUrl(carrier?: string | null, no?: string | null): string | null {
  if (!carrier || !no || !/^[A-Za-z0-9-]{6,40}$/.test(no)) return null;
  const key = carrier
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  const f = LINKS[key] ?? Object.entries(LINKS).find(([k]) => key.startsWith(k))?.[1];
  return f ? f(encodeURIComponent(no)) : null;
}
