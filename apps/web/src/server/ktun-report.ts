/**
 * KTÜN (GTIN) bazlı aylık sipariş karşılama raporu.
 *
 * E-İhracat Desteklerine İlişkin Genelge (13.04.2026) Madde 15/6: Bakanlığın sipariş karşılama hizmeti
 * sunan firma listesine girmek için depolama hizmeti veren sağlayıcıdan "KTÜN bazlı aylık raporlama"
 * beklenir. Destekte de KTÜN ve Türkiye'deki üretim yeri bilgisi aranır (Madde 5, 15/8).
 *
 * Kaynak: stok hareket defteri (StockMovement) + o döneme ait fatura kalemleri.
 * Dönem başı/sonu stoğu güncel stoktan geriye doğru hesaplanır (defterle tutarlı, tohum verisinden bağımsız).
 * TODO(verify): Bakanlığın beklediği kesin rapor şablonu (sütunlar, dosya biçimi) E-İhracat Sekretaryası'ndan
 * alınmalı; bu rapor desteklenen gider ayrımını (15/4) ve ürün bazlı hareketleri kapsar.
 */
import { periodRange } from "@avrupadasat/core/billing";
import { forTenant } from "@avrupadasat/db";
import { linesOfInvoice } from "./billing";
import { toCsv } from "./csv";
import { db } from "./db";

export interface KtunRow {
  ktun: string | null;
  sku: string;
  name: string;
  opening: number;
  received: number;
  shipped: number;
  returned: number;
  damaged: number;
  adjusted: number;
  closing: number;
  ordersFulfilled: number;
}

export interface KtunReport {
  period: string;
  tenantName: string;
  rows: KtunRow[];
  missingKtun: string[];
  /** Fatura kalemlerinden: Genelge 15/4'e göre desteklenebilir ve diğer giderler (net, kuruş) */
  fees: {
    invoiceNumber: string | null;
    fulfillmentCents: number;
    storageCents: number;
    otherCents: number;
  } | null;
}

/** Genelge 15/4: birim başına sipariş karşılama (iade kabulü dâhil) ve depolama giderleri */
const FULFILLMENT_CODES = new Set(["PICKPACK", "RETURNS"]);
const STORAGE_CODES = new Set(["STORAGE"]);

/** GTIN-8/12/13/14 kontrol hanesi doğrulaması */
export function isValidGtin(v: string | null | undefined): boolean {
  if (!v || !/^(\d{8}|\d{12,14})$/.test(v)) return false;
  const digits = v.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export async function ktunMonthlyReport(tenantId: string, period: string): Promise<KtunReport> {
  const [from, to] = periodRange(period);
  const t = forTenant(db(), tenantId);
  const [tenant, items, since, inPeriod, invoice] = await Promise.all([
    db().tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { name: true } }),
    t.stockItem.findMany({ orderBy: { sku: "asc" } }),
    t.stockMovement.groupBy({
      by: ["sku"],
      where: { createdAt: { gte: from } },
      _sum: { delta: true },
    }),
    t.stockMovement.findMany({
      where: { createdAt: { gte: from, lt: to } },
      select: { sku: true, delta: true, reason: true, refId: true },
    }),
    t.invoice.findFirst({ where: { period }, orderBy: { createdAt: "desc" } }),
  ]);
  const afterTo = await t.stockMovement.groupBy({
    by: ["sku"],
    where: { createdAt: { gte: to } },
    _sum: { delta: true },
  });
  const sinceFrom = new Map(since.map((x) => [x.sku, x._sum.delta ?? 0]));
  const sinceTo = new Map(afterTo.map((x) => [x.sku, x._sum.delta ?? 0]));

  const rows: KtunRow[] = items.map((i) => {
    const mv = inPeriod.filter((m) => m.sku === i.sku);
    const sum = (reason: string, sign: 1 | -1 = 1) =>
      mv.filter((m) => m.reason === reason).reduce((s, m) => s + m.delta * sign, 0);
    const orderRefs = new Set(
      mv.filter((m) => m.reason === "ORDER" && m.delta < 0 && m.refId).map((m) => m.refId),
    );
    return {
      ktun: i.ean,
      sku: i.sku,
      name: i.name,
      opening: i.quantity - (sinceFrom.get(i.sku) ?? 0),
      received: sum("RECEIVE"),
      shipped: sum("ORDER", -1),
      returned: sum("RETURN"),
      damaged: sum("DAMAGE", -1),
      adjusted: sum("ADJUST"),
      closing: i.quantity - (sinceTo.get(i.sku) ?? 0),
      ordersFulfilled: orderRefs.size,
    };
  });
  // Dönemde hareketi veya stoğu olmayan kalemler rapora girmez
  const active = rows.filter(
    (r) =>
      r.opening !== 0 ||
      r.closing !== 0 ||
      r.received + r.shipped + r.returned + r.damaged !== 0 ||
      r.adjusted !== 0,
  );

  let fees: KtunReport["fees"] = null;
  if (invoice) {
    const f = {
      invoiceNumber: invoice.number,
      fulfillmentCents: 0,
      storageCents: 0,
      otherCents: 0,
    };
    for (const l of linesOfInvoice(invoice)) {
      if (FULFILLMENT_CODES.has(l.code)) f.fulfillmentCents += l.totalCents;
      else if (STORAGE_CODES.has(l.code)) f.storageCents += l.totalCents;
      else f.otherCents += l.totalCents;
    }
    fees = f;
  }
  return {
    period,
    tenantName: tenant.name,
    rows: active,
    missingKtun: active.filter((r) => !isValidGtin(r.ktun)).map((r) => r.sku),
    fees,
  };
}

const eur = (c: number) => (c / 100).toFixed(2).replace(".", ",");

export function ktunReportCsv(r: KtunReport): string {
  const out: unknown[][] = [
    ["Firma", r.tenantName],
    ["Dönem", r.period],
    ["Ülke", "DE"],
    [],
    [
      "KTÜN (GTIN)",
      "KTÜN geçerli",
      "SKU",
      "Ürün",
      "Dönem başı stok",
      "Mal kabul",
      "Gönderilen adet",
      "İade kabul",
      "Hasar/imha",
      "Düzeltme",
      "Dönem sonu stok",
      "Karşılanan sipariş",
    ],
    ...r.rows.map((x) => [
      x.ktun ?? "",
      isValidGtin(x.ktun) ? "evet" : "hayır",
      x.sku,
      x.name,
      x.opening,
      x.received,
      x.shipped,
      x.returned,
      x.damaged,
      x.adjusted,
      x.closing,
      x.ordersFulfilled,
    ]),
    [],
  ];
  if (r.fees) {
    out.push(
      ["Fatura", r.fees.invoiceNumber ?? "taslak"],
      [
        "Sipariş karşılama giderleri (pick & pack, iade kabulü) — net €",
        eur(r.fees.fulfillmentCents),
      ],
      ["Depolama giderleri — net €", eur(r.fees.storageCents)],
      [
        "Diğer kalemler (abonelik, mal kabul, FBA hazırlık, masraf yansıtma) — net €",
        eur(r.fees.otherCents),
      ],
    );
  } else {
    out.push(["Fatura", "Bu dönem için fatura henüz oluşturulmadı"]);
  }
  return toCsv(out);
}
