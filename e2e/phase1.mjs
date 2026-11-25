// Aşama 1 uçtan uca: site formu → ekip teklif → müşteri onayı → davet → müşteri paneli
import {
  assert,
  BASE,
  browser,
  runWorkerUntil,
  enterTotp,
  setup2fa,
  SHOTS,
  step,
  totp,
  watchThirdParty,
} from "./lib.mjs";

const PW = process.env.SEED_PASSWORD ?? "Demo sifre 2026";
const run = Date.now();
const company = `E2E Seramik ${run}`;
const email = `e2e-${run}@seramik.test`;

const b = await browser();
try {
  // 1) Ziyaretçi: çerez reddi + form
  const visitor = await b.newContext({ locale: "tr-TR" });
  const vp = await visitor.newPage();
  const tp = watchThirdParty(vp);
  let s = step("Site açılıyor, çerez bandı görünüyor");
  await vp.goto(`${BASE}/?utm_source=google&utm_medium=cpc&gclid=E2E${run}`);
  await vp.getByRole("dialog", { name: "Çerez tercihleriniz" }).waitFor();
  await vp.screenshot({ path: `${SHOTS}/01-site-consent.png` });
  await vp.getByRole("button", { name: "Reddet" }).click();
  s.ok();

  s = step("Uygunluk raporu formu: önce hatalı, sonra doğru gönderim");
  await vp.locator("#rapor-formu").getByRole("button", { name: "Ücretsiz raporumu iste" }).click();
  await vp.getByText("KVKK aydınlatma metnini onaylayın").waitFor();
  await vp.getByLabel("Firma adı").fill(company);
  await vp.getByLabel("E-posta", { exact: true }).fill(email);
  await vp.getByLabel("Telefon (WhatsApp)").fill("+90 236 000 00 00");
  await vp.getByLabel("Ürün kategorisi").selectOption("ev-mutfak");
  await vp.locator("#rapor-formu input[name=consentKvkk]").check();
  await vp.locator("#rapor-formu").getByRole("button", { name: "Ücretsiz raporumu iste" }).click();
  await vp.getByText("Talebiniz alındı.").waitFor();
  assert(tp.length === 0, `Onay reddedildiği halde üçüncü taraf isteği: ${tp.join(", ")}`);
  s.ok();

  // 2) Ekip: giriş + 2FA kurulum
  const staff = await b.newContext({ locale: "tr-TR" });
  const sp = await staff.newPage();
  s = step("Yönetici girişi ve zorunlu 2FA kurulumu");
  await sp.goto(`${BASE}/admin`);
  assert(sp.url().includes("/giris"), "korumasız admin");
  await sp.getByLabel("E-posta").fill("admin@avrupadasat.local");
  await sp.getByLabel("Şifre").fill(PW);
  await sp.getByRole("button", { name: "Giriş yap" }).click();
  await sp.waitForURL(/\/(hesap\/2fa|giris\/2fa|admin)/);
  if (sp.url().includes("/giris/2fa")) {
    throw new Error(
      "Yönetici için 2FA zaten kurulu; testi temiz veritabanıyla çalıştırın (pnpm e2e:reset)",
    );
  }
  if (sp.url().includes("/hesap/2fa")) await setup2fa(sp);
  await sp.waitForURL(`${BASE}/admin`);
  await sp.screenshot({ path: `${SHOTS}/02-admin-home.png` });
  s.ok();

  s = step("Talep listede, kaynak Google Ads; teklif oluşturuluyor");
  await sp.goto(`${BASE}/admin/talepler`);
  const row = sp.getByRole("row", { name: new RegExp(company) });
  assert((await row.textContent()).includes("Google Ads"), "kaynak bilgisi yok");
  await row.getByRole("link", { name: company }).click();
  await sp.getByLabel("Paket").selectOption("PAZARA_GIRIS");
  await sp.getByLabel("Şirket").selectOption("GMBH");
  await sp.getByRole("button", { name: "Teklif oluştur" }).click();
  await sp.waitForURL(/\/admin\/teklifler\//);
  assert(await sp.getByText("€2.100").count(), "GmbH indirimli kuruluş tutarı yok");
  s.ok();

  s = step("Teklif PDF'i iniyor");
  const pdfRes = await sp.request.get(sp.url() + "/pdf");
  assert(pdfRes.ok() && (await pdfRes.body()).subarray(0, 5).toString() === "%PDF-", "PDF yok");
  s.ok();

  s = step("Teklif gönderiliyor; bağlantı bir kez gösteriliyor");
  await sp.getByRole("button", { name: "Müşteriye gönder" }).click();
  const link = await sp.locator(".alert-info a").getAttribute("href");
  assert(link.includes("/teklif/"), "bağlantı yok");
  await sp.screenshot({ path: `${SHOTS}/03-admin-quote.png` });
  s.ok();

  // 3) Müşteri: onay
  const client = await b.newContext({ locale: "tr-TR" });
  const cp = await client.newPage();
  s = step("Müşteri teklifi açıp onaylıyor");
  const quoteUrl = link.replace(/^https?:\/\/[^/]+/, BASE);
  const res = await cp.goto(quoteUrl);
  assert(
    res.headers()["referrer-policy"] === "no-referrer",
    "token sayfasında referrer koruması yok",
  );
  await cp.getByRole("button", { name: "Teklifi onayla" }).click();
  // Tarayıcı doğrulaması: zorunlu alanlar
  assert((await cp.getByText("Teşekkürler!").count()) === 0, "boş form onaylandı");
  await cp.getByLabel("Firma adına onaylayan (ad soyad)").fill("Elif Kaya");
  await cp.locator("input[name=terms]").check();
  await cp.getByRole("button", { name: "Teklifi onayla" }).click();
  await cp.getByText("Teşekkürler!").waitFor();
  await cp.screenshot({ path: `${SHOTS}/04-quote-accepted.png` });
  const again = await cp.goto(quoteUrl);
  assert(
    again.ok() && (await cp.getByText("tarafından onaylandı").count()) === 1,
    "onay durumu görünmüyor",
  );
  s.ok();

  // 4) Davet e-postası (worker) → şifre → giriş → 2FA → panel
  s = step("Worker davet e-postasını gönderiyor");
  const m = await runWorkerUntil(
    new RegExp(`davet edildiniz → ${email.replace(/[.]/g, "\\.")} \\| (\\S+/sifre/\\S+)`),
  );
  const invite = m[1].replace(/^https?:\/\/[^/]+/, BASE);
  s.ok();

  s = step("Müşteri şifresini belirliyor, giriş yapıp 2FA kuruyor");
  await cp.goto(invite);
  await cp.getByLabel("Yeni şifre", { exact: true }).fill("kisa1");
  await cp.getByLabel("Yeni şifre (tekrar)").fill("kisa1");
  await cp.getByRole("button", { name: "Şifreyi kaydet" }).click();
  await cp
    .getByText(/en az 12 karakter/i)
    .first()
    .waitFor();
  await cp.getByLabel("Yeni şifre", { exact: true }).fill("Seramik ihracat 2027");
  await cp.getByLabel("Yeni şifre (tekrar)").fill("Seramik ihracat 2027");
  await cp.getByRole("button", { name: "Şifreyi kaydet" }).click();
  await cp.waitForURL(/\/giris\?sifre=ok/);
  await cp.getByLabel("E-posta").fill(email);
  await cp.getByLabel("Şifre").fill("Seramik ihracat 2027");
  await cp.getByRole("button", { name: "Giriş yap" }).click();
  await cp.waitForURL(/\/hesap\/2fa/);
  const secret = await setup2fa(cp);
  await cp.waitForURL(`${BASE}/panel`);
  await cp.getByRole("heading", { name: "Hoş geldiniz, Elif" }).waitFor();
  s.ok();

  s = step("Müşteri ekip paneline giremiyor; davet bağlantısı ikinci kez kullanılamıyor");
  await cp.goto(`${BASE}/admin`);
  assert(!cp.url().endsWith("/admin"), "müşteri admin'e girdi");
  await cp.goto(invite);
  await cp.getByText("Bağlantı geçersiz").waitFor();
  s.ok();

  s = step("Çıkış ve 2FA ile yeniden giriş");
  await cp.goto(`${BASE}/panel`);
  await cp.getByRole("button", { name: "Çıkış" }).click();
  await cp.waitForURL(/\/giris/);
  await cp.getByLabel("E-posta").fill(email);
  await cp.getByLabel("Şifre").fill("Seramik ihracat 2027");
  await cp.getByRole("button", { name: "Giriş yap" }).click();
  await cp.waitForURL(/\/giris\/2fa/);
  await cp.getByLabel("Doğrulama kodu").fill("000000");
  await cp.getByRole("button", { name: "Doğrula" }).click();
  await cp.getByText("Kod hatalı").waitFor();
  await enterTotp(cp, secret);
  await cp.waitForURL(`${BASE}/panel`);
  s.ok();

  s = step("Ekip panelinde müşteri kartı ve audit kayıtları");
  await sp.goto(`${BASE}/admin/musteriler`);
  await sp.getByRole("link", { name: company }).click();
  await sp.getByText("Alman noterinde kuruluş").waitFor();
  await sp.screenshot({ path: `${SHOTS}/05-admin-tenant.png` });
  await sp.goto(`${BASE}/admin/audit`);
  for (const a of [
    "quote.accepted",
    "auth.2fa_enabled",
    "auth.password_set",
    "auth.login_failed",
  ]) {
    assert(await sp.getByText(a, { exact: true }).count(), `audit'te ${a} yok`);
  }
  s.ok();
  console.log("\nAşama 1 uçtan uca: TÜMÜ GEÇTİ");
} finally {
  await b.close();
}
