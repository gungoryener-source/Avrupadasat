import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { brand } from "@avrupadasat/core/brand.config";
import { formatEur, type QuoteLine } from "@avrupadasat/core/pricing";

/** DejaVu Sans: Türkçe karakterleri (ş, ğ, ı, İ) destekler; serbest lisans */
async function fonts(doc: PDFDocument) {
  const dir = path.join(process.cwd(), "assets", "fonts");
  doc.registerFontkit(fontkit);
  const [regular, bold] = await Promise.all([
    readFile(path.join(dir, "DejaVuSans.ttf")),
    readFile(path.join(dir, "DejaVuSans-Bold.ttf")),
  ]);
  return {
    regular: await doc.embedFont(regular, { subset: true }),
    bold: await doc.embedFont(bold, { subset: true }),
  };
}

function wrap(text: string, font: PDFFont, size: number, max: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > max && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export interface QuotePdfInput {
  number: string;
  companyName: string;
  email: string;
  createdAt: Date;
  validUntil: Date;
  packageName: string;
  lines: QuoteLine[];
  oneTimeCents: number;
  monthlyCents: number;
  priceListVersion: string;
  acceptedAt?: Date | null;
  acceptedByName?: string | null;
}

const RED = rgb(0.784, 0.063, 0.18);
const INK = rgb(0.043, 0.075, 0.141);
const MUTE = rgb(0.357, 0.392, 0.471);

export async function quotePdf(q: QuotePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Teklif ${q.number}`);
  doc.setAuthor(brand.name);
  doc.setLanguage("tr-TR");
  const { regular, bold } = await fonts(doc);
  const page: PDFPage = doc.addPage([595.28, 841.89]);
  const L = 50;
  const W = 495;
  let y = 790;
  const d = (x: Date) => x.toLocaleDateString("tr-TR");

  page.drawRectangle({ x: L, y: y - 6, width: 30, height: 30, color: RED });
  page.drawText(brand.monogram, { x: L + 6, y: y + 4, size: 11, font: bold, color: rgb(1, 1, 1) });
  page.drawText(brand.name, { x: L + 40, y: y + 8, size: 16, font: bold, color: INK });
  page.drawText(brand.tagline, { x: L + 40, y: y - 6, size: 8, font: regular, color: MUTE });
  page.drawText("TEKLİF", { x: L + W - 80, y: y + 8, size: 16, font: bold, color: RED });
  page.drawText(q.number, { x: L + W - 80, y: y - 6, size: 9, font: regular, color: MUTE });

  y -= 60;
  page.drawText(q.companyName, { x: L, y, size: 13, font: bold, color: INK });
  page.drawText(q.email, { x: L, y: y - 16, size: 9, font: regular, color: MUTE });
  page.drawText(`Tarih: ${d(q.createdAt)}`, {
    x: L + W - 150,
    y,
    size: 9,
    font: regular,
    color: INK,
  });
  page.drawText(`Geçerlilik: ${d(q.validUntil)}`, {
    x: L + W - 150,
    y: y - 14,
    size: 9,
    font: regular,
    color: INK,
  });
  page.drawText(`Paket: ${q.packageName}`, { x: L, y: y - 40, size: 11, font: bold, color: INK });

  y -= 74;
  page.drawRectangle({ x: L, y: y - 6, width: W, height: 22, color: rgb(0.96, 0.97, 0.98) });
  page.drawText("Açıklama", { x: L + 8, y, size: 9, font: bold, color: INK });
  page.drawText("Tür", { x: L + 330, y, size: 9, font: bold, color: INK });
  page.drawText("Tutar", { x: L + W - 60, y, size: 9, font: bold, color: INK });
  y -= 26;
  for (const line of q.lines) {
    const rows = wrap(line.description, regular, 9, 310);
    rows.forEach((r, i) =>
      page.drawText(r, { x: L + 8, y: y - i * 12, size: 9, font: regular, color: INK }),
    );
    page.drawText(line.recurring ? "Aylık" : "Tek sefer", {
      x: L + 330,
      y,
      size: 9,
      font: regular,
      color: MUTE,
    });
    const amount = formatEur(line.quantity * line.unitCents);
    page.drawText(amount, {
      x: L + W - 8 - regular.widthOfTextAtSize(amount, 9),
      y,
      size: 9,
      font: regular,
      color: INK,
    });
    y -= rows.length * 12 + 10;
    page.drawLine({
      start: { x: L, y: y + 4 },
      end: { x: L + W, y: y + 4 },
      thickness: 0.5,
      color: rgb(0.9, 0.91, 0.94),
    });
  }
  y -= 10;
  for (const [label, cents] of [
    ["Tek seferlik toplam", q.oneTimeCents],
    ["Aylık toplam", q.monthlyCents],
  ] as const) {
    const v = formatEur(cents);
    page.drawText(label, { x: L + 300, y, size: 10, font: bold, color: INK });
    page.drawText(v, {
      x: L + W - 8 - bold.widthOfTextAtSize(v, 11),
      y,
      size: 11,
      font: bold,
      color: INK,
    });
    y -= 18;
  }

  y -= 20;
  const notes = [
    "Tutarlar KDV hariçtir.",
    "Noter, ticaret sicili ve devlet harçları ile şirket sermayesi fiyata dahil değildir; gerçekleşen tutar birebir yansıtılır.",
    "Depolama, mal kabul, paketleme, iade ve kargo bedelleri yayınlanan fiyat listesine göre kullanım kadar faturalanır. Kurulum ücreti yoktur; aylık hizmetler bir ay önceden bildirimle feshedilebilir.",
    `Fiyat listesi: ${q.priceListVersion}.`,
    brand.independenceNotice,
  ];
  for (const n of notes) {
    for (const r of wrap(n, regular, 8, W)) {
      page.drawText(r, { x: L, y, size: 8, font: regular, color: MUTE });
      y -= 11;
    }
    y -= 3;
  }

  if (q.acceptedAt) {
    y -= 14;
    page.drawRectangle({
      x: L,
      y: y - 30,
      width: W,
      height: 40,
      borderColor: rgb(0.075, 0.54, 0.29),
      borderWidth: 1,
    });
    page.drawText(
      `Çevrimiçi onaylandı: ${q.acceptedAt.toLocaleString("tr-TR")} — ${q.acceptedByName ?? ""}`,
      {
        x: L + 10,
        y: y - 14,
        size: 9,
        font: bold,
        color: rgb(0.075, 0.54, 0.29),
      },
    );
  }
  return doc.save();
}
