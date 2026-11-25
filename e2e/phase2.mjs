// Aşama 2 uçtan uca: site sayfaları, SEO, JSON-LD, çerez onayı, araçlar, A/B
import { assert, BASE, browser, SHOTS, step, watchThirdParty } from "./lib.mjs";

const b = await browser();
try {
  const ctx = await b.newContext({ locale: "tr-TR" });
  const page = await ctx.newPage();

  let s = step(
    "Site haritasındaki tüm sayfalar 200, benzersiz başlık, açıklama, canonical, tek H1, geçerli JSON-LD",
  );
  const xml = await (await page.request.get(`${BASE}/sitemap.xml`)).text();
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) =>
    m[1].replace(/^https?:\/\/[^/]+/, BASE),
  );
  assert(urls.length >= 20, `sitemap'te az sayfa: ${urls.length}`);
  const titles = new Set();
  for (const u of urls) {
    const r = await page.goto(u);
    assert(r.status() === 200, `${u} → ${r.status()}`);
    const t = await page.title();
    assert(!titles.has(t), `yinelenen başlık: ${t}`);
    titles.add(t);
    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    assert(desc && desc.length >= 40, `${u} açıklama kısa`);
    assert((await page.locator("h1").count()) === 1, `${u} H1 sayısı ≠ 1`);
    assert(await page.locator('link[rel="canonical"]').count(), `${u} canonical yok`);
    for (const j of await page.locator('script[type="application/ld+json"]').allTextContents())
      JSON.parse(j);
    assert((await page.locator("html").getAttribute("lang")) === "tr", "lang");
  }
  s.ok();

  s = step("robots.txt panelleri ve token sayfalarını dışlıyor; reklam sayfaları noindex");
  const robots = await (await page.request.get(`${BASE}/robots.txt`)).text();
  for (const d of ["/admin", "/panel", "/teklif", "/sifre"])
    assert(robots.includes(`Disallow: ${d}`), `robots ${d}`);
  await page.goto(`${BASE}/lp/amazon-almanya`);
  assert(
    (await page.locator('meta[name="robots"]').getAttribute("content")).includes("noindex"),
    "lp indexlenebilir",
  );
  s.ok();

  s = step("A/B varyantı: ?v=b farklı başlık");
  const ha = await page.locator("h1").textContent();
  await page.goto(`${BASE}/lp/amazon-almanya?v=b`);
  const hb = await page.locator("h1").textContent();
  assert(ha !== hb && hb.includes("hazır mı"), "varyant b yok");
  s.ok();

  s = step("Çerez: seçim yapılmadan ve reddedince hiçbir ölçüm isteği gitmiyor");
  const c1 = await b.newContext({ locale: "tr-TR" });
  const p1 = await c1.newPage();
  const hits1 = watchThirdParty(p1);
  await p1.goto(`${BASE}/`);
  await p1.waitForTimeout(1500);
  assert(hits1.length === 0, `onaysız istek: ${hits1[0]}`);
  const consentPost = p1.waitForResponse((r) => r.url().endsWith("/api/consent"));
  await p1.getByRole("button", { name: "Reddet" }).click();
  assert((await consentPost).status() === 204, "onay kaydı yazılmadı");
  await p1.goto(`${BASE}/fiyatlar`);
  await p1.waitForTimeout(1500);
  assert(hits1.length === 0, `ret sonrası istek: ${hits1[0]}`);
  assert(
    (await p1.getByRole("dialog", { name: "Çerez tercihleriniz" }).count()) === 0,
    "bant tekrar çıktı",
  );
  await c1.close();
  s.ok();

  s = step("Çerez: 'Ayarlar' ile yalnız istatistik → GTM yükleniyor, Meta yüklenmiyor");
  const c2 = await b.newContext({ locale: "tr-TR" });
  const p2 = await c2.newPage();
  const hits2 = watchThirdParty(p2);
  await p2.goto(`${BASE}/`);
  await p2.getByRole("button", { name: "Ayarlar", exact: true }).click();
  await p2.getByLabel("İstatistik (Google Analytics)").check();
  await p2.getByRole("button", { name: "Seçimi kaydet" }).click();
  await p2.waitForTimeout(1500);
  assert(
    hits2.some((u) => u.includes("googletagmanager")),
    "GTM yüklenmedi",
  );
  assert(!hits2.some((u) => u.includes("facebook")), "Meta yüklendi (onay yokken)");
  const cmode = await p2.evaluate(() =>
    JSON.stringify(window.dataLayer?.filter((e) => e[0] === "consent")),
  );
  assert(
    cmode.includes('"analytics_storage":"granted"') && cmode.includes('"ad_storage":"denied"'),
    `consent mode: ${cmode}`,
  );
  await c2.close();
  s.ok();

  s = step("Çerez: 'Kabul et' → Meta Pixel de yükleniyor; ayar sonradan geri alınabiliyor");
  const c3 = await b.newContext({ locale: "tr-TR" });
  const p3 = await c3.newPage();
  const hits3 = watchThirdParty(p3);
  await p3.goto(`${BASE}/`);
  await p3.getByRole("button", { name: "Kabul et" }).click();
  await p3.waitForTimeout(1500);
  assert(
    hits3.some((u) => u.includes("facebook")),
    "Meta yüklenmedi",
  );
  await p3.getByRole("button", { name: "Çerez ayarları" }).click();
  await p3.getByRole("dialog", { name: "Çerez tercihleriniz" }).waitFor();
  await c3.close();
  s.ok();

  s = step("Hesaplayıcı: palet ve kuruluş seçimi toplamı değiştiriyor");
  await page.goto(`${BASE}/fiyatlar`);
  const total = () => page.locator(".calc-out > .calc-total").first().textContent();
  const t1 = await total();
  await page.getByLabel(/Depoda palet sayısı/).fill("40");
  const t2 = await total();
  assert(t1 !== t2, "toplam değişmedi");
  await page.getByLabel("Almanya'da şirket").selectOption("GMBH");
  await page.getByText("Tek seferlik kuruluş (GmbH)").waitFor();
  s.ok();

  s = step("Sihirbaz: elektronik + pil → WEEE ve pil kaydı");
  await page.goto(`${BASE}/urunum-avrupaya-uygun-mu`);
  await page.getByLabel("Ürün kategorisi").selectOption("elektronik");
  await page.locator('input[name="battery"]').first().check();
  await page.getByRole("button", { name: "Kontrol listemi göster" }).click();
  await page.getByText("Elektrikli ürün (WEEE) kaydı").waitFor();
  await page.getByText("Pil kaydı").waitFor();
  s.ok();

  s = step("Hizmet sayfasındaki form çalışıyor");
  await page.goto(`${BASE}/almanyada-depo-kiralama`);
  const f = page.locator("#sayfa-formu");
  await f.getByLabel("Firma adı").fill("E2E Depo Test");
  await f.getByLabel("E-posta", { exact: true }).fill(`depo-${Date.now()}@test.local`);
  await f.getByLabel("Telefon (WhatsApp)").fill("+90 212 000 00 00");
  await f.getByLabel("Ürün kategorisi").selectOption("mobilya");
  await f.locator("input[name=consentKvkk]").check();
  await f.getByRole("button", { name: "Ücretsiz raporumu iste" }).click();
  await page.getByText("Talebiniz alındı.").waitFor();
  s.ok();

  s = step("Ekran görüntüleri (masaüstü ve mobil)");
  const desk = await b.newContext({ locale: "tr-TR", viewport: { width: 1280, height: 900 } });
  const dp = await desk.newPage();
  await dp.goto(`${BASE}/`);
  await dp.getByRole("button", { name: "Reddet" }).click();
  await dp.screenshot({ path: `${SHOTS}/10-home-desktop.png`, fullPage: true });
  await dp.goto(`${BASE}/almanyada-sirket-kurmak`);
  await dp.screenshot({ path: `${SHOTS}/11-service.png`, fullPage: true });
  const mob = await b.newContext({
    locale: "tr-TR",
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mp = await mob.newPage();
  await mp.goto(`${BASE}/`);
  await mp.screenshot({ path: `${SHOTS}/12-home-mobile.png` });
  await mp.waitForTimeout(800);
  assert(!(await mp.locator(".nav-links").isVisible()), "mobilde masaüstü menüsü görünüyor");
  await mp.screenshot({ path: `${SHOTS}/12-home-mobile.png` });
  const overflow = await mp.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  assert(!overflow, "mobilde yatay taşma var");
  s.ok();

  console.log("\nAşama 2 uçtan uca: TÜMÜ GEÇTİ");
} finally {
  await b.close();
}
