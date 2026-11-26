import { chromium } from "playwright-core";
import { login } from "./lib.mjs";
const BASE = "http://localhost:3200";
const OUT = "/tmp/demo-shots";
const PW = "Demo-Sifre-2026!";
const b = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--no-sandbox"],
});
const ctx = await b.newContext({
  locale: "tr-TR",
  viewport: { width: 1360, height: 850 },
  deviceScaleFactor: 2,
});
const p = await ctx.newPage();
const shot = async (name, url, opts = {}) => {
  if (url) await p.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: false, ...opts });
  console.log("✓", name);
};
// Site
await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
await p.getByRole("button", { name: "Reddet" }).click();
await shot("01-ana-sayfa");
await shot("02-fiyatlar", "/fiyatlar");
await p
  .locator("form, .calc, section")
  .filter({ hasText: /hesapla/i })
  .first()
  .scrollIntoViewIfNeeded()
  .catch(() => {});
await shot("03-hesaplayici");
await shot("04-uygunluk-raporu", "/ucretsiz-uygunluk-raporu");
await p.goto(`${BASE}/gumruk-atr-ve-3-euro-vergisi`, { waitUntil: "networkidle" });
await p.locator("table").first().scrollIntoViewIfNeeded();
await p.evaluate(() => window.scrollBy(0, -120));
await shot("05-gumruk-tablosu");
await shot("06-e-ihracat-rehberi", "/e-ihracat-destek-rehberi");
// Müşteri paneli
await login(p, "zeynep@yildiztekstil.demo", PW, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
await shot("10-panel-genel", "/panel");
await p.locator("h2", { hasText: "Hizmet seviyesi" }).scrollIntoViewIfNeeded();
await p.evaluate(() => window.scrollBy(0, -80));
await shot("11-panel-sla");
await shot("12-panel-sevkiyatlar", "/panel/sevkiyatlar");
await p.locator("a", { hasText: "YT-2026-012" }).first().click();
await p.waitForLoadState("networkidle");
await shot("13-sevkiyat-detay");
await shot("14-panel-stok", "/panel/stok");
await shot("15-panel-siparisler", "/panel/siparisler");
await shot("16-panel-sirket", "/panel/sirket");
await p.evaluate(() => document.getElementById("ab-sorumlu").scrollIntoView({ block: "start" }));
await shot("17-ab-sorumlu-taraf");
await shot("18-panel-faturalar", "/panel/faturalar");
// Ekip paneli
const c2 = await b.newContext({
  locale: "tr-TR",
  viewport: { width: 1360, height: 850 },
  deviceScaleFactor: 2,
});
const a = await c2.newPage();
await a.goto(`${BASE}/`);
await a
  .getByRole("button", { name: "Reddet" })
  .click()
  .catch(() => {});
await login(a, "demo-yonetici@avrupadasat.local", PW, "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP");
for (const [n, u] of [
  ["20-ekip-ozet", "/admin"],
  ["21-ekip-talepler", "/admin/talepler"],
  ["22-ekip-teklifler", "/admin/teklifler"],
  ["23-ekip-musteriler", "/admin/musteriler"],
  ["24-ekip-sevkiyatlar", "/admin/sevkiyatlar"],
  ["25-ekip-siparisler", "/admin/siparisler"],
  ["26-ekip-disa-aktar", "/admin/disa-aktar"],
]) {
  await a.goto(`${BASE}${u}`, { waitUntil: "networkidle" });
  await a.waitForTimeout(300);
  await a.screenshot({ path: `${OUT}/${n}.png` });
  console.log("✓", n);
}
// Mobil görünüm (site)
const m = await b.newContext({
  locale: "tr-TR",
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
});
const mp = await m.newPage();
await mp.goto(`${BASE}/`, { waitUntil: "networkidle" });
await mp.screenshot({ path: `${OUT}/30-mobil-ana-sayfa.png` });
console.log("✓ 30-mobil");
await b.close();
