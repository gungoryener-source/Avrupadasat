import { db } from "./db";

/**
 * Sabit pencereli hız sınırı. true = izin verildi.
 * Tek SQL ile atomik: pencere dolduysa sıfırlar, değilse artırır.
 */
export async function hit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const rows = await db().$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart") VALUES (${key}, 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec})
                     THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSec})
                     THEN now() ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;
  return (rows[0]?.count ?? 0) <= limit;
}
