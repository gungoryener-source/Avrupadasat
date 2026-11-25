/** RFC 6238 TOTP (SHA-1, 6 hane, 30 sn) — Google Authenticator vb. ile uyumlu */
import { createHmac, randomBytes } from "node:crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error("Geçersiz base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

export function hotp(secret: Buffer, counter: number, digits = 6): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", secret).update(buf).digest();
  const offset = mac[mac.length - 1]! & 0xf;
  const code = (mac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return code.toString().padStart(digits, "0");
}

export function totp(secretB32: string, at = Date.now(), step = 30, digits = 6): string {
  return hotp(base32Decode(secretB32), Math.floor(at / 1000 / step), digits);
}

/** ±1 adım saat kaymasına izin verir */
export function verifyTotp(secretB32: string, code: string, at = Date.now()): boolean {
  return matchTotpStep(secretB32, code, at) !== null;
}

/** Eşleşen zaman adımını döner; tekrar kullanım kontrolü için çağıran saklar */
export function matchTotpStep(
  secretB32: string,
  code: string,
  at = Date.now(),
  lastUsedStep: number | null = null,
): number | null {
  const c = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return null;
  const now = Math.floor(at / 30_000);
  for (const w of [-1, 0, 1]) {
    const step = now + w;
    if (lastUsedStep !== null && step <= lastUsedStep) continue;
    if (hotp(base32Decode(secretB32), step) === c) return step;
  }
  return null;
}

export function otpauthUri(secretB32: string, account: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
