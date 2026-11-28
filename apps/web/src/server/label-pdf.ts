/**
 * Ürün etiketleri (PDF): her adet için bir etiket. Barkod vektör olarak çizilir (keskin baskı).
 * - termal: 50×25 mm, sayfa başına 1 etiket (Zebra vb. etiket yazıcıları)
 * - a4: 70×37 mm, 3×8 = 24 etiket (yaygın A4 etiket kağıdı)
 */
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { code128Bars } from "./barcode";
import { fonts } from "./pdf";

export type LabelFormat = "termal" | "a4";
export const LABEL_FORMATS: Record<LabelFormat, string> = {
  termal: "Termal etiket 50×25 mm",
  a4: "A4 etiket kağıdı 70×37 mm (24'lü)",
};
export const MAX_LABELS = 2000;

export interface LabelItem {
  code: string;
  name: string;
  sku: string;
}

const MM = 72 / 25.4;
const BLACK = rgb(0, 0, 0);
const GREY = rgb(0.3, 0.3, 0.3);
const QUIET = 10; // modül

function fit(text: string, font: PDFFont, size: number, max: number): string {
  if (font.widthOfTextAtSize(text, size) <= max) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** En fazla `lines` satıra sarar; taşan son satır üç noktayla biter */
function wrapLines(text: string, font: PDFFont, size: number, max: number, lines: number) {
  const out: string[] = [];
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let i = 0;
  for (; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i]!;
    if (font.widthOfTextAtSize(next, size) > max && line) {
      out.push(line);
      line = words[i]!;
      if (out.length === lines - 1) break;
    } else line = next;
  }
  const rest = [line, ...words.slice(i + 1)].filter(Boolean).join(" ");
  if (rest) out.push(fit(rest, font, size, max));
  return out.slice(0, lines).map((l) => fit(l, font, size, max));
}

function drawLabel(
  page: PDFPage,
  box: { x: number; y: number; w: number; h: number },
  item: LabelItem,
  f: { regular: PDFFont; bold: PDFFont },
  s: { pad: number; barH: number; maxModule: number; code: number; name: number; sku: number },
) {
  const { bars, modules } = code128Bars(item.code);
  const inner = box.w - 2 * s.pad;
  const m = Math.min(inner / (modules + 2 * QUIET), s.maxModule);
  const bw = modules * m;
  const bx = box.x + (box.w - bw) / 2;
  const top = box.y + box.h - s.pad;
  for (const b of bars) {
    page.drawRectangle({
      x: bx + b.x * m,
      y: top - s.barH,
      width: b.w * m,
      height: s.barH,
      color: BLACK,
    });
  }
  let y = top - s.barH - s.code - 1;
  const cw = f.bold.widthOfTextAtSize(item.code, s.code);
  page.drawText(item.code, {
    x: box.x + (box.w - cw) / 2,
    y,
    size: s.code,
    font: f.bold,
    color: BLACK,
  });
  for (const l of wrapLines(item.name, f.regular, s.name, inner, 2)) {
    y -= s.name + 1.5;
    page.drawText(l, { x: box.x + s.pad, y, size: s.name, font: f.regular, color: BLACK });
  }
  page.drawText(fit(`SKU ${item.sku}`, f.regular, s.sku, inner), {
    x: box.x + s.pad,
    y: box.y + s.pad * 0.6,
    size: s.sku,
    font: f.regular,
    color: GREY,
  });
}

export async function labelsPdf(
  entries: { item: LabelItem; count: number }[],
  format: LabelFormat,
): Promise<Uint8Array> {
  const total = entries.reduce((a, e) => a + e.count, 0);
  if (total < 1 || total > MAX_LABELS) throw new Error("Etiket adedi geçersiz");
  const doc = await PDFDocument.create();
  doc.setTitle("Ürün etiketleri");
  doc.setLanguage("tr-TR");
  const f = await fonts(doc);
  const flat = entries.flatMap((e) => Array.from({ length: e.count }, () => e.item));

  if (format === "termal") {
    const w = 50 * MM;
    const h = 25 * MM;
    for (const item of flat) {
      const page = doc.addPage([w, h]);
      drawLabel(page, { x: 0, y: 0, w, h }, item, f, {
        pad: 2.2 * MM,
        barH: 9 * MM,
        maxModule: 0.33 * MM,
        code: 8,
        name: 6,
        sku: 5.5,
      });
    }
  } else {
    const pw = 210 * MM;
    const ph = 297 * MM;
    const cols = 3;
    const rows = 8;
    const lw = 70 * MM;
    const lh = 37 * MM;
    const top = (ph - rows * lh) / 2;
    let page: PDFPage | null = null;
    flat.forEach((item, i) => {
      const slot = i % (cols * rows);
      if (slot === 0) page = doc.addPage([pw, ph]);
      const c = slot % cols;
      const r = Math.floor(slot / cols);
      drawLabel(page!, { x: c * lw, y: ph - top - (r + 1) * lh, w: lw, h: lh }, item, f, {
        pad: 4 * MM,
        barH: 13 * MM,
        maxModule: 0.4 * MM,
        code: 10,
        name: 7.5,
        sku: 6.5,
      });
    });
  }
  return doc.save();
}
