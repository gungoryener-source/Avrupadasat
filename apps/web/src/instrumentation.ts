/**
 * Sunucu başlangıç kontrolü: üretimde eksik veya zayıf gizli anahtarlarla AÇILMA.
 * (Hata, ilk isteği bekleyip kullanıcıya 500 göstermek yerine başlangıçta görünür.)
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  if (process.env.SKIP_ENV_CHECK === "1") return;
  const problems: string[] = [];
  if (!process.env.DATABASE_URL) problems.push("DATABASE_URL yok");
  if ((process.env.AUTH_SECRET ?? "").length < 32)
    problems.push("AUTH_SECRET en az 32 karakter olmalı");
  const keys = process.env.FIELD_ENCRYPTION_KEYS
    ? process.env.FIELD_ENCRYPTION_KEYS.split(",").map((p) => p.split(":")[1] ?? "")
    : [process.env.FIELD_ENCRYPTION_KEY ?? ""];
  if (keys.some((k) => Buffer.from(k.trim(), "base64").length !== 32))
    problems.push("FIELD_ENCRYPTION_KEY(S) 32 bayt (base64) olmalı");
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (!/^https:\/\//.test(site) && !/^http:\/\/localhost(:\d+)?$/.test(site))
    problems.push("NEXT_PUBLIC_SITE_URL https olmalı");
  if (problems.length) {
    throw new Error(`Ortam yapılandırması hatalı:\n- ${problems.join("\n- ")}`);
  }
}
