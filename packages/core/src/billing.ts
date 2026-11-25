/**
 * Aylık müşteri faturası hesaplaması — saf fonksiyon. Tutarlar euro cent.
 * Fiyatlar pricing.ts'ten gelir; site, teklif ve fatura aynı kaynağı kullanır.
 */
import { operations, packages, pickPackRate, type PackageCode } from "./pricing";

export interface UsageInput {
  packageCode: PackageCode | null;
  /** Dönem içi ortalama palet (anlık görüntülerden) */
  avgPallets: number;
  inboundCartons: number;
  ordersShipped: number;
  preFbaCartons: number;
  returnsProcessed: number;
  disbursements: { description: string; amountCents: number }[];
}

export interface InvoiceLine {
  code: string;
  description: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
}

export function invoiceLines(u: UsageInput): InvoiceLine[] {
  const lines: InvoiceLine[] = [];
  const add = (code: string, description: string, quantity: number, unitCents: number) => {
    if (quantity <= 0) return;
    lines.push({
      code,
      description,
      quantity,
      unitCents,
      totalCents: Math.round(quantity * unitCents),
    });
  };
  const pallets = Math.ceil(u.avgPallets);
  if (u.packageCode === "OPERASYON")
    add("SUB", "Operasyon paketi (aylık)", 1, packages.OPERASYON.monthly);
  if (u.packageCode === "PAZARA_GIRIS") {
    const large = pallets >= packages.PAZARA_GIRIS.largeFromPallets;
    add(
      "SUB",
      `Pazara Giriş paketi (aylık${large ? ", 31+ palet" : ""})`,
      1,
      large ? packages.PAZARA_GIRIS.monthlyLarge : packages.PAZARA_GIRIS.monthly,
    );
  }
  add("STORAGE", "Depolama (ortalama palet)", pallets, operations.storagePerPalletMonth);
  add("INBOUND", "Mal kabul (koli)", u.inboundCartons, operations.inboundPerCarton);
  add("PICKPACK", "Pick & pack (sipariş)", u.ordersShipped, pickPackRate(u.ordersShipped));
  add("PREFBA", "Amazon FBA hazırlık (koli)", u.preFbaCartons, operations.preFbaPerCarton);
  add("RETURNS", "İade işleme", u.returnsProcessed, operations.returnPerItem);
  for (const d of u.disbursements) {
    lines.push({
      code: "DISB",
      description: `Masraf yansıtma: ${d.description}`,
      quantity: 1,
      unitCents: d.amountCents,
      totalCents: d.amountCents,
    });
  }
  return lines;
}

export function invoiceTotals(lines: InvoiceLine[], vatRatePct: number) {
  const netCents = lines.reduce((s, l) => s + l.totalCents, 0);
  const vatCents = Math.round((netCents * vatRatePct) / 100);
  return { netCents, vatCents, grossCents: netCents + vatCents };
}

/** "2026-11" → [başlangıç, bitiş) UTC */
export function periodRange(period: string): [Date, Date] {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) throw new Error("Dönem YYYY-AA biçiminde olmalı");
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  if (mo < 0 || mo > 11) throw new Error("Geçersiz ay");
  return [new Date(Date.UTC(y, mo, 1)), new Date(Date.UTC(y, mo + 1, 1))];
}
