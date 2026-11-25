/**
 * Demo verisi — YALNIZCA yerel/staging. Canlıya çıkmaz.
 * Parola hash'i Aşama 1'de (Argon2id) eklenecek; şimdilik kullanıcılar parolasız.
 */
import "dotenv/config";
import { createPrismaClient } from "../src/client";

if (process.env.NODE_ENV === "production") {
  throw new Error("Seed üretimde çalıştırılamaz");
}

const prisma = createPrismaClient();

const firms = [
  { name: "Yıldız Mobilya", slug: "yildiz-mobilya", city: "İnegöl" },
  { name: "Koza İpek", slug: "koza-ipek", city: "Bursa" },
  { name: "Ege Kozmetik", slug: "ege-kozmetik", city: "İzmir" },
];

async function main() {
  await prisma.user.upsert({
    where: { email: "admin@avrupadasat.local" },
    update: {},
    create: { email: "admin@avrupadasat.local", name: "Demo Yönetici", staffRole: "ADMIN" },
  });

  for (const f of firms) {
    const t = await prisma.tenant.upsert({
      where: { slug: f.slug },
      update: {},
      create: { ...f, status: "ONBOARDING", packageCode: "PAZARA_GIRIS" },
    });
    for (const step of ["VEKALETNAME", "APOSTIL", "NOTER", "TICARET_SICILI", "VERGI_NO"] as const) {
      await prisma.registrationTask.upsert({
        where: { tenantId_step: { tenantId: t.id, step } },
        update: {},
        create: { tenantId: t.id, step, status: step === "VERGI_NO" ? "SURUYOR" : "TAMAM" },
      });
    }
    await prisma.shipment.upsert({
      where: { tenantId_reference: { tenantId: t.id, reference: `${f.slug.toUpperCase()}-001` } },
      update: {},
      create: {
        tenantId: t.id,
        reference: `${f.slug.toUpperCase()}-001`,
        stage: "GUMRUK",
        pallets: 6,
      },
    });
  }
  console.info(`Seed tamam: ${firms.length} firma, 1 yönetici`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
