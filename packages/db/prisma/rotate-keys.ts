/** Kullanım: FIELD_ENCRYPTION_KEYS="2:<yeni>,1:<eski>" pnpm db:rotate-keys */
import "dotenv/config";
import { createPrismaClient } from "../src/client";
import { loadKeyring } from "../src/crypto";
import { rotateEncryptedFields } from "../src/rotate";

const prisma = createPrismaClient();
const ring = loadKeyring();
console.info(
  `Etkin anahtar sürümü: ${ring.active}; tanımlı sürümler: ${[...ring.keys.keys()].join(", ")}`,
);
rotateEncryptedFields(prisma, ring)
  .then((r) => {
    for (const x of r)
      console.info(
        `${x.table}.${x.column}: ${x.rotated} yeniden şifrelendi${x.skipped ? `, ${x.skipped} ÇÖZÜLEMEDİ (anahtar eksik?)` : ""}`,
      );
    if (r.some((x) => x.skipped)) process.exitCode = 2;
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
