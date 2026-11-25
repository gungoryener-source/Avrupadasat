// Uçtan uca test yardımcıları (playwright-core + sistem Chrome)
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

export const BASE = process.env.E2E_BASE ?? "http://localhost:3100";
export const SHOTS = process.env.E2E_SHOTS ?? "/tmp/e2e";
mkdirSync(SHOTS, { recursive: true });

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function b32(s) {
  let bits = 0,
    value = 0;
  const out = [];
  for (const ch of s.replace(/\s/g, "").toUpperCase()) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
export function totp(secret, at = Date.now()) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(Math.floor(at / 30000)));
  const mac = createHmac("sha1", b32(secret)).update(buf).digest();
  const o = mac[mac.length - 1] & 15;
  return String((mac.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, "0");
}

export async function browser() {
  return chromium.launch({
    executablePath: process.env.CHROME ?? "/usr/bin/google-chrome",
    args: ["--no-sandbox"],
  });
}

/** Üçüncü taraf ölçüm isteklerini kaydeder (onay testi için) */
export function watchThirdParty(page) {
  const hits = [];
  page.on("request", (r) => {
    const u = r.url();
    if (/googletagmanager|google-analytics|doubleclick|facebook\.net|facebook\.com\/tr/.test(u))
      hits.push(u);
  });
  return hits;
}

export function step(name) {
  process.stdout.write(`• ${name} … `);
  return { ok: () => console.log("✓") };
}

export function assert(cond, msg) {
  if (!cond) throw new Error(`Doğrulama başarısız: ${msg}`);
}

/** Worker'ı çalıştırıp çıktısında desen arar (mock e-posta bağlantıları) */
export function runWorkerUntil(pattern, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const p = spawn("npx", ["tsx", "src/index.ts"], {
      cwd: new URL("../apps/worker/", import.meta.url).pathname,
      env: { ...process.env, NODE_ENV: "development", WORKER_POLL_MS: "500" },
      detached: true,
    });
    let out = "";
    // Süreç grubunun tamamı kapatılır (npx → tsx → node)
    const done = (fn, v) => {
      clearTimeout(t);
      try {
        process.kill(-p.pid, "SIGTERM");
      } catch {}
      fn(v);
    };
    const t = setTimeout(
      () => done(reject, new Error(`Worker çıktısında bulunamadı: ${pattern}\n${out}`)),
      timeoutMs,
    );
    const on = (d) => {
      out += d;
      const m = out.match(pattern);
      if (m) done(resolve, m);
    };
    p.stdout.on("data", on);
    p.stderr.on("data", on);
  });
}

export async function setup2fa(page) {
  await page.getByRole("button", { name: "Kuruluma başla" }).click();
  const secret = (await page.locator(".mono").first().textContent()).trim();
  await page.getByLabel("Uygulamadaki 6 haneli kod").fill(totp(secret));
  await page.getByRole("button", { name: /etkinleştir/ }).click();
  return secret;
}
