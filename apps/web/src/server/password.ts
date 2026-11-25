import { hash, verify } from "@node-rs/argon2";

/** OWASP önerisi: Argon2id, m=19 MiB, t=2, p=1 */
const OPTS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  algorithm: 2 /* Argon2id */,
} as const;

export const PASSWORD_MIN = 12;

export function passwordProblem(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `Şifre en az ${PASSWORD_MIN} karakter olmalı`;
  if (pw.length > 256) return "Şifre çok uzun";
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(pw) || !/\d/.test(pw)) return "Şifrede harf ve rakam olmalı";
  return null;
}

export function hashPassword(pw: string): Promise<string> {
  return hash(pw, OPTS);
}

export async function verifyPassword(stored: string | null, pw: string): Promise<boolean> {
  if (!stored) {
    // Zamanlama farkıyla kullanıcı varlığı sızmasın
    await hash(pw, OPTS);
    return false;
  }
  try {
    return await verify(stored, pw);
  } catch {
    return false;
  }
}
