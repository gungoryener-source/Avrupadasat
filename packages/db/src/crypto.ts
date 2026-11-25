/**
 * Hassas alan şifreleme (vergi no, IBAN): AES-256-GCM.
 * Biçim: v1.<iv>.<tag>.<ciphertext> (base64url). Anahtar: FIELD_ENCRYPTION_KEY (32 bayt base64).
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function loadKey(raw = process.env.FIELD_ENCRYPTION_KEY): Buffer {
  if (!raw) throw new Error("FIELD_ENCRYPTION_KEY tanımlı değil");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("FIELD_ENCRYPTION_KEY 32 bayt olmalı");
  return key;
}

export function encryptField(plain: string, rawKey?: string): string {
  const key = loadKey(rawKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv, tag, ct]
    .map((p) => (typeof p === "string" ? p : p.toString("base64url")))
    .join(".");
}

export function decryptField(token: string, rawKey?: string): string {
  const [v, iv, tag, ct] = token.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Geçersiz şifreli alan");
  const decipher = createDecipheriv("aes-256-gcm", loadKey(rawKey), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString(
    "utf8",
  );
}

/** Loglarda ve arayüzde gösterim: son 4 hane hariç maskeler */
export function maskTail(value: string, visible = 4): string {
  const clean = value.replace(/\s/g, "");
  if (clean.length <= visible) return "•".repeat(clean.length);
  return "•".repeat(clean.length - visible) + clean.slice(-visible);
}
