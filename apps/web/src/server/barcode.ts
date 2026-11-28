/**
 * Depo etiketi barkodu: platform etiket kodu (StockItem.labelCode) Code 128 ile basılır.
 * Kod veritabanında üretilir (gen_label_code): "D" + 7 karakter Crockford Base32.
 */
import bwipjs from "bwip-js/node";

/** Etiket kodu biçimi (I, L, O, U kullanılmaz) */
export const LABEL_CODE_RE = /^D[0-9A-HJKMNP-TV-Z]{7}$/;

/**
 * Okutulan/yazılan değeri temizler: boşluk ve kontrol karakterlerini atar, büyük harfe çevirir.
 * Etiket koduna benzeyen değerlerde elle yazımdaki O→0, I/L→1 karışıklığını düzeltir.
 */
export function normalizeScan(input: string): string {
  const s = input.replace(/[\s\u0000-\u001f\u007f]/g, "").toUpperCase();
  if (s.length === 8 && s.startsWith("D")) {
    const fixed = "D" + s.slice(1).replace(/O/g, "0").replace(/[IL]/g, "1");
    if (LABEL_CODE_RE.test(fixed)) return fixed;
  }
  return s;
}

export function isLabelCode(s: string): boolean {
  return LABEL_CODE_RE.test(s);
}

/**
 * Code 128 modül genişlikleri: sırayla çubuk, boşluk, çubuk… (her değer 1–4 modül).
 * Sessiz bölgeler dahil değildir.
 */
export function code128Widths(text: string): number[] {
  if (!text || text.length > 40 || !/^[\x20-\x7e]+$/.test(text))
    throw new Error("Geçersiz barkod metni");
  const r = bwipjs.raw("code128", text, {})[0];
  if (!r || !("sbs" in r)) throw new Error("Barkod üretilemedi");
  return r.sbs;
}

/** Barkodun yalnız çubuklarını (x, genişlik) modül cinsinden verir */
export function code128Bars(text: string): { bars: { x: number; w: number }[]; modules: number } {
  const widths = code128Widths(text);
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });
  return { bars, modules: x };
}

/** Ekranda gösterim için SVG (sessiz bölge 10 modül; ölçeklenir, kenarlar keskin kalır) */
export function code128Svg(text: string, height = 40): string {
  const { bars, modules } = code128Bars(text);
  const q = 10;
  const rects = bars
    .map((b) => `<rect x="${b.x + q}" y="0" width="${b.w}" height="${height}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${modules + 2 * q} ${height}" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="Barkod ${text}"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
}

/** Raf etiketi: "RAF" + konum (ör. RAFA-03-2). Konum kuralı stock.setLocation ile aynıdır. */
export const SHELF_PREFIX = "RAF";
export const LOCATION_RE = /^[A-Z0-9][A-Z0-9 ./-]{0,23}$/;

export function shelfBarcode(location: string): string {
  return `${SHELF_PREFIX}${location}`;
}

/**
 * Okutulan değer bir raf etiketiyse konumu döndürür. Türkçe Q klavyeye ayarlı olmayan
 * USB okuyucular "-" yerine "*" yazar; bu düzeltilir.
 */
export function parseShelfScan(raw: string): string | null {
  // eslint-disable-next-line no-control-regex
  const s = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim().toUpperCase();
  if (!s.startsWith(SHELF_PREFIX)) return null;
  const loc = s.slice(SHELF_PREFIX.length).replace(/\*/g, "-").trim();
  return LOCATION_RE.test(loc) ? loc : null;
}
