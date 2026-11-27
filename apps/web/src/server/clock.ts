/** Sunucu bileşenlerinde "şimdi" (istek anında hesaplanır; sayfalar dinamik) */
export function nowMs(): number {
  return Date.now();
}
