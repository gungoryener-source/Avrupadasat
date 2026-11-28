import { randomBytes } from "node:crypto";
/**
 * Demo verisi — uygulamanın gerçek iş fonksiyonlarıyla üretilir. YALNIZ ayrı bir demo veritabanında çalıştırın.
 *   DATABASE_URL=postgresql://…/avrupadasat_demo npx tsx scripts/demo-data.ts
 * Canlıya çıkmaz (NODE_ENV=production'da çalışmaz). Kişiler ve firmalar kurgusaldır.
 */
import { encryptField } from "@avrupadasat/db/crypto";
import { currentPeriod } from "./demo-period";
import { draftInvoice, issueInvoice } from "../src/server/billing";
import { db } from "../src/server/db";
import { saveEuParty } from "../src/server/eu-party";
import { createQuote } from "../src/server/quotes";
import { setLeadStatus, submitLead } from "../src/server/leads";
import {
  connectChannel,
  processReturn,
  registerReturn,
  shipOrder,
  syncOrders,
} from "../src/server/orders";
import { hashPassword } from "../src/server/password";
import { advanceStage, createAsn, importCatalog, receiveShipment } from "../src/server/shipments";

// Yalnız demo veritabanı: adı avrupadasat_demo olan ya da açıkça demo ortamı olarak işaretlenmiş
// (DEMO_ENVIRONMENT=1, ör. Vercel demo projesi). Gerçek müşteri veritabanında asla çalışmaz.
const demoEnv = process.env.DEMO_ENVIRONMENT === "1";
if (process.env.NODE_ENV === "production" && !demoEnv)
  throw new Error("Demo verisi üretimde çalıştırılamaz");
if (!demoEnv && !/avrupadasat_demo/.test(process.env.DATABASE_URL ?? ""))
  throw new Error("Yalnız avrupadasat_demo veritabanında çalışır");

/** Rastgele base32 TOTP anahtarı (20 bayt) */
function randomTotpSecret() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  return Array.from(randomBytes(32), (b) => alphabet[b % 32]).join("");
}

// Giriş bilgileri depoya yazılmaz: .env'den okunur ya da her çalıştırmada üretilip ekrana basılır.
export const DEMO = {
  password: process.env.DEMO_PASSWORD ?? `Demo-${randomBytes(6).toString("hex")}!`,
  adminSecret: process.env.DEMO_ADMIN_TOTP ?? randomTotpSecret(),
  ownerSecret: process.env.DEMO_OWNER_TOTP ?? randomTotpSecret(),
  admin: "demo-yonetici@avrupadasat.local",
  owner: "zeynep@yildiztekstil.demo",
};

/** GTIN-13 kontrol hanesi */
function gtin13(base12: string) {
  const sum = base12
    .split("")
    .map(Number)
    .reduce((s, d, i) => s + d * (i % 2 === 0 ? 1 : 3), 0);
  return base12 + ((10 - (sum % 10)) % 10);
}

async function user(email: string, name: string, staffRole: "ADMIN" | null, secret: string) {
  return db().user.create({
    data: {
      email,
      name,
      staffRole,
      passwordHash: await hashPassword(DEMO.password),
      twoFactorSecretEnc: encryptField(secret),
      twoFactorEnabledAt: new Date(),
    },
  });
}

/**
 * Demo giriş bilgilerini ortamdaki değerlere eşitler (DEMO_RESET_CREDENTIALS=1).
 * Yalnız iki demo hesabına dokunur; açık oturumları kapatır, kilidi kaldırır. Değerler günlüğe yazılmaz.
 */
async function resetCredentials() {
  if (!process.env.DEMO_PASSWORD || !process.env.DEMO_ADMIN_TOTP || !process.env.DEMO_OWNER_TOTP)
    throw new Error("Sıfırlama için DEMO_PASSWORD, DEMO_ADMIN_TOTP ve DEMO_OWNER_TOTP gerekli");
  const passwordHash = await hashPassword(DEMO.password);
  for (const [email, secret] of [
    [DEMO.admin, DEMO.adminSecret],
    [DEMO.owner, DEMO.ownerSecret],
  ] as const) {
    const u = await db().user.findUnique({ where: { email } });
    if (!u) continue;
    await db().$transaction([
      db().user.update({
        where: { id: u.id },
        data: {
          passwordHash,
          twoFactorSecretEnc: encryptField(secret),
          twoFactorEnabledAt: new Date(),
          failedLogins: 0,
          lockedUntil: null,
        },
      }),
      db().session.deleteMany({ where: { userId: u.id } }),
    ]);
  }
  console.info("Demo giriş bilgileri ortam değerlerine eşitlendi");
}

async function main() {
  if (process.env.DEMO_RESET_CREDENTIALS === "1") await resetCredentials();
  if (await db().tenant.findUnique({ where: { slug: "yildiz-tekstil" } })) {
    console.info("Demo verisi zaten yüklü, atlanıyor");
    return;
  }
  const admin = await user(DEMO.admin, "Elif Kaya", "ADMIN", DEMO.adminSecret);
  const T = (
    await db().tenant.create({
      data: {
        name: "Yıldız Tekstil",
        slug: "yildiz-tekstil",
        city: "Denizli",
        status: "ACTIVE",
        packageCode: "PAZARA_GIRIS",
      },
    })
  ).id;
  const owner = await user(DEMO.owner, "Zeynep Demir", null, DEMO.ownerSecret);
  await db().membership.create({ data: { userId: owner.id, tenantId: T, role: "CLIENT_OWNER" } });
  await db().registrationTask.createMany({
    data: (
      [
        "VEKALETNAME",
        "APOSTIL",
        "NOTER",
        "TICARET_SICILI",
        "VERGI_NO",
        "UST_ID",
        "EORI",
        "LUCID",
      ] as const
    ).map((step) => ({ tenantId: T, step, status: "TAMAM" as const, note: "Tamamlandı" })),
  });
  await saveEuParty(
    T,
    {
      importerModel: "OWN_DE_COMPANY",
      responsibleName: "Yıldız Tekstil GmbH",
      responsibleAddress: "Hafenstraße 12, 47119 Duisburg",
      responsibleEmail: "produkt@yildiztekstil.demo",
      lucidNumber: "DE4029381726354",
    },
    owner.id,
  );

  const products = [
    ["HV-50-BYZ", "Pamuklu havlu 50x90 beyaz", "869123400001"],
    ["HV-50-GRI", "Pamuklu havlu 50x90 gri", "869123400002"],
    ["HV-70-BYZ", "Banyo havlusu 70x140 beyaz", "869123400003"],
    ["BRN-L-BYZ", "Bornoz L beyaz", "869123400004"],
    ["BRN-M-LAC", "Bornoz M lacivert", "869123400005"],
    ["PST-ST-3", "Peştemal seti (3'lü)", "869123400006"],
  ];
  await importCatalog(
    T,
    "sku;ad;ean\n" + products.map(([s, n, e]) => `${s};${n};${gtin13(e!)}`).join("\n"),
    owner.id,
  );

  // Sevkiyat 1: depoya kabul edildi (bir kolide hasar)
  const s1 = await createAsn(
    T,
    {
      reference: "YT-2026-011",
      origin: "Denizli",
      carrier: "Ekol",
      pallets: 8,
      cartons: 96,
      lines: [
        { sku: "HV-50-BYZ", quantity: 600 },
        { sku: "HV-50-GRI", quantity: 400 },
        { sku: "HV-70-BYZ", quantity: 300 },
        { sku: "BRN-L-BYZ", quantity: 120 },
        { sku: "BRN-M-LAC", quantity: 120 },
        { sku: "PST-ST-3", quantity: 200 },
      ],
    },
    owner.id,
  );
  for (const st of ["TR_CIKIS", "AB_GIRIS", "GUMRUK"] as const)
    await advanceStage(T, s1.id, st, null, admin.id);
  await receiveShipment(
    T,
    s1.id,
    [
      { sku: "HV-50-BYZ", receivedQty: 600, damagedQty: 0 },
      { sku: "HV-50-GRI", receivedQty: 398, damagedQty: 2 },
      { sku: "HV-70-BYZ", receivedQty: 300, damagedQty: 0 },
      { sku: "BRN-L-BYZ", receivedQty: 120, damagedQty: 0 },
      { sku: "BRN-M-LAC", receivedQty: 120, damagedQty: 0 },
      { sku: "PST-ST-3", receivedQty: 200, damagedQty: 0 },
    ],
    admin.id,
  );
  // Sevkiyat 2: yolda (AB girişi)
  const s2 = await createAsn(
    T,
    {
      reference: "YT-2026-012",
      origin: "Denizli",
      carrier: "Ekol",
      expectedAt: new Date(Date.now() + 5 * 86_400_000),
      pallets: 6,
      cartons: 72,
      lines: [
        { sku: "HV-50-BYZ", quantity: 500 },
        { sku: "BRN-L-BYZ", quantity: 150 },
      ],
    },
    owner.id,
  );
  for (const st of ["TR_CIKIS", "AB_GIRIS"] as const)
    await advanceStage(T, s2.id, st, null, admin.id);

  // Satış kanalları (demo modu) ve siparişler
  for (const ch of ["AMAZON", "EBAY", "WEBSHOP"] as const) {
    await connectChannel(T, ch, owner.id);
    await syncOrders(T, ch);
  }
  const orders = await db().order.findMany({
    where: { tenantId: T, status: { in: ["NEW", "ALLOCATED"] } },
    orderBy: { orderedAt: "asc" },
  });
  let n = 0;
  for (const o of orders.slice(0, Math.ceil(orders.length * 0.6))) {
    n++;
    await shipOrder(T, o.id, "DHL", `0034043416${String(1000000000 + n).slice(-10)}`, admin.id);
  }
  const shipped = await db().order.findFirst({
    where: { tenantId: T, status: "SHIPPED" },
    include: { lines: true },
  });
  if (shipped) {
    const r = await registerReturn(
      T,
      { orderId: shipped.id, sku: shipped.lines[0]!.sku, quantity: 1, reason: "Beden uymadı" },
      admin.id,
    );
    if (r.ok) await processReturn(T, r.id, "SELLABLE", admin.id);
  }
  await draftInvoice(T, currentPeriod(), admin.id);
  const inv = await db().invoice.findFirstOrThrow({ where: { tenantId: T } });
  await issueInvoice(inv.id, admin.id);

  // Diğer firmalar: kuruluş sürecinde
  for (const [name, slug, city, pending] of [
    ["Koza İpek", "koza-ipek", "Bursa", "VERGI_NO"],
    ["Ege Kozmetik", "ege-kozmetik", "İzmir", "NOTER"],
  ] as const) {
    const t = await db().tenant.create({
      data: { name, slug, city, status: "ONBOARDING", packageCode: "OPERASYON" },
    });
    const steps = [
      "VEKALETNAME",
      "APOSTIL",
      "NOTER",
      "TICARET_SICILI",
      "VERGI_NO",
      "UST_ID",
    ] as const;
    const idx = steps.indexOf(pending);
    await db().registrationTask.createMany({
      data: steps.map((step, i) => ({
        tenantId: t.id,
        step,
        status:
          i < idx ? ("TAMAM" as const) : i === idx ? ("SURUYOR" as const) : ("BEKLIYOR" as const),
      })),
    });
  }

  // CRM: uygunluk raporu talepleri ve bir teklif
  const leads = [
    ["Anadolu Seramik A.Ş.", "info@anadoluseramik.demo", "ev-mutfak", "213.0.113.21"],
    ["Ege Zeytinyağı Ltd.", "dis.ticaret@egezeytin.demo", "gida", "213.0.113.22"],
    ["İnegöl Mobilya San.", "export@inegolmobilya.demo", "mobilya", "213.0.113.23"],
  ] as const;
  const ids: string[] = [];
  for (const [companyName, email, category, ip] of leads) {
    const r = await submitLead(
      {
        companyName,
        email,
        phone: "+90 532 000 00 00",
        category,
        consentKvkk: true,
        attribution: { utmSource: "google", utmCampaign: "almanya-depo" },
      },
      ip,
    );
    if (r.ok) ids.push(r.leadId);
  }
  if (ids[0]) await setLeadStatus(ids[0], "REPORT_SENT", admin.id, "Rapor gönderildi");
  if (ids[2]) {
    await setLeadStatus(ids[2], "REPORT_SENT", admin.id);
    await createQuote({
      leadId: ids[2],
      packageCode: "PAZARA_GIRIS",
      companyForm: "GMBH",
      actorUserId: admin.id,
    });
  }
  console.info(
    `Demo hazır: ${orders.length} sipariş (${n} kargolandı), 2 sevkiyat, ${ids.length} talep`,
  );
  // Bilgiler .env'den geldiyse günlüğe yazılmaz (ör. Vercel derleme günlüğü); yalnız rastgele üretildiyse gösterilir
  if (!process.env.DEMO_PASSWORD) {
    console.info(
      `Giriş: ${DEMO.admin} / ${DEMO.owner} · şifre ${DEMO.password} · TOTP yönetici ${DEMO.adminSecret}, sahip ${DEMO.ownerSecret}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db().$disconnect());
