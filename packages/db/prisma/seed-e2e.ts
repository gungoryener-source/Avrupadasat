/**
 * Uçtan uca testler için sabit hesaplar (YALNIZ yerel/CI). Her çalıştırmada sıfırlanır.
 * Çıktı: kimlik bilgileri ve TOTP sırları (JSON, stdout).
 */
import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { createPrismaClient } from "../src/client";
import { encryptField } from "../src/crypto";

if (process.env.NODE_ENV === "production") throw new Error("E2E seed üretimde çalıştırılamaz");

const prisma = createPrismaClient();
const PW = "E2E guvenli sifre 2026";
// RFC örnek sırları (yalnız test)
const SECRETS = {
  admin: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
  owner: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
  partner: "MFRGGZDFMZTWQ2LKNNWG23TPOBYXE43U",
  other: "KRUGKIDROVUWG2ZAMJZG653OEBTG66BA",
};

async function user(
  email: string,
  name: string,
  staffRole: "ADMIN" | "PARTNER" | null,
  secret: string,
) {
  await prisma.user.deleteMany({ where: { email } });
  return prisma.user.create({
    data: {
      email,
      name,
      staffRole,
      passwordHash: await hash(PW, {
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
        algorithm: 2,
      }),
      twoFactorSecretEnc: encryptField(secret),
      twoFactorEnabledAt: new Date(),
    },
  });
}

async function main() {
  await prisma.tenant.deleteMany({ where: { slug: { in: ["e2e-tekstil", "e2e-diger"] } } });
  await prisma.rateLimit.deleteMany({});
  const tenant = await prisma.tenant.create({
    data: {
      name: "E2E Tekstil",
      slug: "e2e-tekstil",
      city: "Denizli",
      packageCode: "PAZARA_GIRIS",
    },
  });
  const other = await prisma.tenant.create({
    data: { name: "E2E Diğer Firma", slug: "e2e-diger" },
  });
  const admin = await user("e2e-admin@avrupadasat.local", "E2E Yönetici", "ADMIN", SECRETS.admin);
  const owner = await user("e2e-owner@tekstil.test", "Zeynep Demir", null, SECRETS.owner);
  const partner = await user("e2e-partner@depo.test", "Depo Partner", "PARTNER", SECRETS.partner);
  const otherOwner = await user("e2e-other@diger.test", "Diğer Sahip", null, SECRETS.other);
  await prisma.membership.create({
    data: { userId: owner.id, tenantId: tenant.id, role: "CLIENT_OWNER" },
  });
  await prisma.membership.create({
    data: { userId: otherOwner.id, tenantId: other.id, role: "CLIENT_OWNER" },
  });
  await prisma.partnerAssignment.create({ data: { userId: partner.id, tenantId: tenant.id } });
  await prisma.registrationTask.createMany({
    data: [
      { tenantId: tenant.id, step: "VEKALETNAME", status: "TAMAM" },
      { tenantId: tenant.id, step: "APOSTIL", status: "TAMAM" },
      { tenantId: tenant.id, step: "NOTER", status: "TAMAM" },
      { tenantId: tenant.id, step: "TICARET_SICILI", status: "TAMAM" },
      { tenantId: tenant.id, step: "VERGI_NO", status: "SURUYOR" },
      { tenantId: tenant.id, step: "UST_ID", status: "BEKLIYOR" },
      { tenantId: tenant.id, step: "EORI", status: "BEKLIYOR" },
      { tenantId: tenant.id, step: "LUCID", status: "BEKLIYOR" },
    ],
  });
  const os = await prisma.shipment.create({
    data: { tenantId: other.id, reference: "GIZLI-1", pallets: 3 },
  });
  process.stdout.write(
    JSON.stringify({
      password: PW,
      admin: { email: admin.email, secret: SECRETS.admin },
      owner: { email: owner.email, secret: SECRETS.owner },
      partner: { email: partner.email, secret: SECRETS.partner },
      other: { email: otherOwner.email, secret: SECRETS.other },
      tenantId: tenant.id,
      otherTenantId: other.id,
      otherShipmentId: os.id,
    }) + "\n",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
