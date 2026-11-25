/**
 * Hassas alan şifreleme (vergi no, IBAN, TOTP sırrı, alıcı adresi): AES-256-GCM.
 * Biçim: v<sürüm>.<iv>.<tag>.<ciphertext> (base64url).
 *
 * Anahtarlar (sürümlü, rotasyon için):
 *   FIELD_ENCRYPTION_KEYS="2:<base64>,1:<base64>"   — İLK sıradaki etkin anahtardır (yeni şifreleme)
 *   FIELD_ENCRYPTION_KEY="<base64>"                 — tek anahtar; sürüm 1 kabul edilir (geriye uyumlu)
 * Eski sürümle şifrelenmiş veriler çözülmeye devam eder; `pnpm db:rotate-keys` hepsini etkin anahtara taşır.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface Keyring {
  active: number;
  keys: Map<number, Buffer>;
}

function parseKey(raw: string, label: string): Buffer {
  const key = Buffer.from(raw.trim(), "base64");
  if (key.length !== 32) throw new Error(`${label} 32 bayt olmalı`);
  return key;
}

export function loadKeyring(env: NodeJS.ProcessEnv = process.env): Keyring {
  const list = env.FIELD_ENCRYPTION_KEYS?.trim();
  if (list) {
    const keys = new Map<number, Buffer>();
    let active = 0;
    for (const part of list.split(",")) {
      const m = /^\s*(\d{1,4}):(.+)$/.exec(part);
      if (!m) throw new Error("FIELD_ENCRYPTION_KEYS biçimi: 2:<base64>,1:<base64>");
      const v = Number(m[1]);
      if (keys.has(v)) throw new Error(`Yinelenen anahtar sürümü: ${v}`);
      keys.set(v, parseKey(m[2]!, `FIELD_ENCRYPTION_KEYS sürüm ${v}`));
      if (!active) active = v;
    }
    return { active, keys };
  }
  const single = env.FIELD_ENCRYPTION_KEY;
  if (!single) throw new Error("FIELD_ENCRYPTION_KEY veya FIELD_ENCRYPTION_KEYS tanımlı değil");
  return { active: 1, keys: new Map([[1, parseKey(single, "FIELD_ENCRYPTION_KEY")]]) };
}

/** Testler ve tek seferlik kullanım: ham anahtar → sürüm 1 */
const ringFor = (rawKey?: string): Keyring =>
  rawKey ? { active: 1, keys: new Map([[1, parseKey(rawKey, "Anahtar")]]) } : loadKeyring();

export function encryptWith(ring: Keyring, plain: string): string {
  const key = ring.keys.get(ring.active)!;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    `v${ring.active}`,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ct.toString("base64url"),
  ].join(".");
}

export function tokenVersion(token: string): number | null {
  const m = /^v(\d{1,4})\./.exec(token);
  return m ? Number(m[1]) : null;
}

export function decryptWith(ring: Keyring, token: string): string {
  const [v, iv, tag, ct] = token.split(".");
  const version = tokenVersion(token);
  if (version === null || !iv || !tag || !ct || v !== `v${version}`)
    throw new Error("Geçersiz şifreli alan");
  const key = ring.keys.get(version);
  if (!key) throw new Error(`Şifreleme anahtarı sürüm ${version} tanımlı değil`);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString(
    "utf8",
  );
}

export function encryptField(plain: string, rawKey?: string): string {
  return encryptWith(ringFor(rawKey), plain);
}

export function decryptField(token: string, rawKey?: string): string {
  return decryptWith(ringFor(rawKey), token);
}

/** Etkin anahtardan farklı sürümle şifrelenmiş mi? */
export function needsRotation(token: string, ring: Keyring = loadKeyring()): boolean {
  return tokenVersion(token) !== ring.active;
}

/** Loglarda ve arayüzde gösterim: son 4 hane hariç maskeler */
export function maskTail(value: string, visible = 4): string {
  const clean = value.replace(/\s/g, "");
  if (clean.length <= visible) return "•".repeat(clean.length);
  return "•".repeat(clean.length - visible) + clean.slice(-visible);
}
