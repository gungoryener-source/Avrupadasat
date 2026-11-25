/**
 * Şifreli alanları etkin anahtara taşır (yeniden şifreleme). Tekrar çalıştırılabilir (idempotent):
 * yalnız eski sürümdeki değerler güncellenir. Koşullu güncelleme ile eşzamanlı yazımı ezmez.
 */
import type { PrismaClient } from "./generated/prisma/client";
import { decryptWith, encryptWith, loadKeyring, tokenVersion, type Keyring } from "./crypto";

/** Şifreli sütunlar: [model tablosu, sütun] */
export const ENCRYPTED_COLUMNS = [
  ["Tenant", "taxNumberEnc"],
  ["Tenant", "ibanEnc"],
  ["User", "twoFactorSecretEnc"],
  ["Order", "shipToEnc"],
  ["MarketplaceConnection", "credentialsEnc"],
] as const;

export interface RotationReport {
  table: string;
  column: string;
  rotated: number;
  skipped: number;
}

export async function rotateEncryptedFields(
  prisma: PrismaClient,
  ring: Keyring = loadKeyring(),
  batch = 500,
): Promise<RotationReport[]> {
  const out: RotationReport[] = [];
  for (const [table, column] of ENCRYPTED_COLUMNS) {
    let rotated = 0;
    const skipped = new Set<string>();
    const prefix = `v${ring.active}.`;
    for (;;) {
      // Tablo/sütun adları sabit listeden gelir (kullanıcı girdisi değil)
      const rows = await prisma.$queryRawUnsafe<{ id: string; v: string }[]>(
        `SELECT "id", "${column}" AS v FROM "${table}" WHERE "${column}" IS NOT NULL AND "${column}" NOT LIKE $1 LIMIT ${batch}`,
        `${prefix}%`,
      );
      if (rows.length === 0) break;
      let progressed = 0;
      for (const r of rows) {
        if (tokenVersion(r.v) === ring.active) continue;
        let plain: string;
        try {
          plain = decryptWith(ring, r.v);
        } catch {
          skipped.add(r.id);
          continue;
        }
        const n = await prisma.$executeRawUnsafe(
          `UPDATE "${table}" SET "${column}" = $1 WHERE "id" = $2 AND "${column}" = $3`,
          encryptWith(ring, plain),
          r.id,
          r.v,
        );
        rotated += n;
        progressed += n;
      }
      // Çözülemeyen kayıtlar sonsuz döngüye sokmasın
      if (progressed === 0) break;
    }
    out.push({ table, column, rotated, skipped: skipped.size });
  }
  return out;
}
