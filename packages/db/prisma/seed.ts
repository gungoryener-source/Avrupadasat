/**
 * Demo verisi — YALNIZCA yerel/staging. Canlıya çıkmaz.
 * Demo şifre: SEED_PASSWORD (varsayılan yalnız yerel geliştirme içindir).
 */
import "dotenv/config";
import { hash } from "@node-rs/argon2";
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

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "Demo sifre 2026";

async function main() {
  const passwordHash = await hash(SEED_PASSWORD, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    algorithm: 2,
  });
  await prisma.user.upsert({
    where: { email: "admin@avrupadasat.local" },
    update: {},
    create: {
      email: "admin@avrupadasat.local",
      name: "Demo Yönetici",
      staffRole: "ADMIN",
      passwordHash,
    },
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
  const first = await prisma.tenant.findUniqueOrThrow({ where: { slug: firms[0]!.slug } });
  const owner = await prisma.user.upsert({
    where: { email: "musteri@yildiz.local" },
    update: {},
    create: { email: "musteri@yildiz.local", name: "Demo Müşteri", passwordHash },
  });
  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: owner.id, tenantId: first.id } },
    update: {},
    create: { userId: owner.id, tenantId: first.id, role: "CLIENT_USER" },
  });
  console.info(
    `Seed tamam: ${firms.length} firma, demo yönetici ve müşteri (şifre: SEED_PASSWORD)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
