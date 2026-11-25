import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "./client";
import { decryptWith, encryptWith, loadKeyring, needsRotation, tokenVersion } from "./crypto";
import { rotateEncryptedFields } from "./rotate";

const k1 = randomBytes(32).toString("base64");
const k2 = randomBytes(32).toString("base64");

describe("anahtar halkası", () => {
  it("tek anahtar → sürüm 1 (geriye uyumlu)", () => {
    const r = loadKeyring({ FIELD_ENCRYPTION_KEY: k1 });
    expect(r.active).toBe(1);
    expect(tokenVersion(encryptWith(r, "x"))).toBe(1);
  });

  it("çok anahtar: ilk sıradaki etkin; eski sürüm çözülür; rotasyon gerekliliği", () => {
    const old = loadKeyring({ FIELD_ENCRYPTION_KEY: k1 });
    const t1 = encryptWith(old, "DE89370400440532013000");
    const ring = loadKeyring({ FIELD_ENCRYPTION_KEYS: `2:${k2},1:${k1}` });
    expect(ring.active).toBe(2);
    expect(decryptWith(ring, t1)).toBe("DE89370400440532013000");
    expect(needsRotation(t1, ring)).toBe(true);
    const t2 = encryptWith(ring, "x");
    expect(t2.startsWith("v2.")).toBe(true);
    expect(needsRotation(t2, ring)).toBe(false);
    // Eski anahtar kaldırılırsa eski veri çözülemez — rotasyon tamamlanmadan kaldırmayın
    expect(() => decryptWith(loadKeyring({ FIELD_ENCRYPTION_KEYS: `2:${k2}` }), t1)).toThrow(
      /sürüm 1/,
    );
  });

  it("hatalı yapılandırma reddedilir", () => {
    expect(() => loadKeyring({ FIELD_ENCRYPTION_KEYS: "2:kisa" })).toThrow();
    expect(() => loadKeyring({ FIELD_ENCRYPTION_KEYS: `1:${k1},1:${k2}` })).toThrow(/Yinelenen/);
    expect(() => loadKeyring({})).toThrow();
  });
});

describe.skipIf(!process.env.DATABASE_URL)("veritabanı rotasyonu", () => {
  const prisma = createPrismaClient();
  const run = `rot${Date.now()}`;
  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { slug: { startsWith: run } } });
    await prisma.$disconnect();
  });

  it("eski sürümdeki alanlar etkin anahtara taşınır, değer korunur; tekrar çalıştırmak bir şey değiştirmez", async () => {
    const old = loadKeyring({ FIELD_ENCRYPTION_KEY: k1 });
    const t = await prisma.tenant.create({
      data: {
        name: "Rot",
        slug: `${run}-a`,
        ibanEnc: encryptWith(old, "DE02120300000000202051"),
        taxNumberEnc: encryptWith(old, "12/345/67890"),
      },
    });
    // Bu testin anahtarıyla çözülemeyen (başka ortamdan) kayıtlar atlanır, döngü takılmaz
    const ring = loadKeyring({ FIELD_ENCRYPTION_KEYS: `2:${k2},1:${k1}` });
    const r = await rotateEncryptedFields(prisma, ring, 50);
    const iban = r.find((x) => x.column === "ibanEnc")!;
    expect(iban.rotated).toBeGreaterThanOrEqual(1);
    const after = await prisma.tenant.findUniqueOrThrow({ where: { id: t.id } });
    expect(after.ibanEnc!.startsWith("v2.")).toBe(true);
    expect(decryptWith(ring, after.ibanEnc!)).toBe("DE02120300000000202051");
    expect(decryptWith(ring, after.taxNumberEnc!)).toBe("12/345/67890");
    const again = await rotateEncryptedFields(prisma, ring, 50);
    expect(again.find((x) => x.column === "ibanEnc")!.rotated).toBe(0);
  });
});
