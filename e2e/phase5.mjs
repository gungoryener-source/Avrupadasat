// Aşama 5 uçtan uca: Almanca içerik onayı, mesaj taslağı + insan onayı, mobil API, DATEV
import { assert, BASE, browser, login, seedE2E, SHOTS, step, totp } from "./lib.mjs";

const E = seedE2E();
const b = await browser();
try {
  const op = await (await b.newContext({ locale: "tr-TR" })).newPage();
  const ap = await (await b.newContext({ locale: "tr-TR" })).newPage();
  await login(op, E.owner.email, E.password, E.owner.secret);
  await login(ap, E.admin.email, E.password, E.admin.secret);

  let s = step("Almanca ürün içeriği: taslak → demo metni onaylanmıyor → düzenleyip onay");
  await op.goto(`${BASE}/panel/stok`);
  await op.getByLabel("veya yapıştırın").fill("sku;ad\nHV-50;Havlu 50x90");
  await op.getByRole("button", { name: "İçe aktar" }).click();
  await op.getByText("1 ürün eklendi").waitFor();
  await op.getByRole("link", { name: "Hazırla" }).click();
  await op.getByLabel(/Özellikler/).fill("%100 pamuk\n500 g/m²\n60°C yıkanabilir");
  await op.getByRole("button", { name: "Kaydet" }).click();
  await op.getByText("Kaydedildi.").waitFor();
  await op.getByRole("button", { name: "2. Almanca taslak hazırla" }).click();
  await op.getByText(/Taslak hazır/).waitFor();
  await op.reload();
  assert((await op.getByLabel("Titel").inputValue()).includes("[Demo]"), "taslak yok");
  await op.getByRole("button", { name: "Onayla" }).click();
  await op.getByText(/Demo metni içeren içerik onaylanamaz/).waitFor();
  await op.getByLabel("Titel").fill("Frottee-Handtuch 50x90 cm, 100 % Baumwolle");
  await op.getByLabel(/Aufzählungspunkte/).fill("100 % Baumwolle\n500 g/m²\nWaschbar bei 60 °C");
  await op
    .getByLabel("Beschreibung")
    .fill("Weiches, saugfähiges Handtuch aus reiner Baumwolle für den täglichen Gebrauch.");
  await op.getByRole("button", { name: "Onayla" }).click();
  await op.getByText("Onaylandı.").waitFor();
  await op.goto(`${BASE}/panel/stok`);
  await op.getByRole("row", { name: /HV-50/ }).getByText("Onaylı").waitFor();
  s.ok();

  s = step("Hazırlık: kayıtlar tamam, stok sayımı, Amazon (demo) siparişleri");
  await ap.goto(`${BASE}/admin/musteriler/${E.tenantId}`);
  await ap.getByLabel("Sayım CSV").fill("sku;miktar\nHV-50;30");
  await ap.getByRole("button", { name: "Sayımı işle" }).click();
  await ap.waitForTimeout(500);
  for (const st of ["VERGI_NO", "UST_ID"]) {
    const f = ap.locator(`form:has(input[name="step"][value="${st}"])`);
    await f.locator('select[name="status"]').selectOption("TAMAM");
    await f.getByRole("button", { name: "Kaydet" }).click();
    await ap.waitForTimeout(500);
  }
  await op.goto(`${BASE}/panel/siparisler`);
  await op
    .locator('form:has(input[value="AMAZON"])')
    .getByRole("button", { name: "Bağla" })
    .click();
  await op.getByRole("button", { name: "Siparişleri şimdi çek" }).click();
  await op.getByText("Hazırlanıyor").first().waitFor();
  s.ok();

  s = step(
    "Mesaj: Türkçe çeviri, yapay zekâ taslağı, onay kutusu olmadan gönderilmiyor, onayla gönderiliyor",
  );
  await op.goto(`${BASE}/panel/mesajlar`);
  await op.getByRole("button", { name: "Yeni mesajları çek" }).click();
  await op.getByRole("link", { name: "Lieferzeit" }).click();
  await op.waitForURL(/\/panel\/mesajlar\/[a-z0-9]+$/);
  await op.getByRole("heading", { name: "Türkçe çeviri" }).waitFor();
  await op.getByText(/\[Demo çeviri\] Hallo/).waitFor();
  await op.getByRole("button", { name: "Yapay zekâ ile taslak hazırla" }).click();
  await op.getByLabel(/Gönderilecek yanıt/).waitFor();
  await op
    .getByLabel(/Gönderilecek yanıt/)
    .fill("Guten Tag, Ihre Bestellung wird heute verschickt. Viele Grüße");
  await op.getByRole("button", { name: "Onayla ve gönder" }).click();
  assert((await op.getByText(/tarihinde gönderildi/).count()) === 0, "onaysız gönderildi");
  await op.getByLabel("Yanıtı okudum ve gönderilmesini onaylıyorum.").check();
  await op.getByRole("button", { name: "Onayla ve gönder" }).click();
  await op.getByText(/tarihinde gönderildi/).waitFor();
  await op.screenshot({ path: `${SHOTS}/40-panel-message.png`, fullPage: true });
  s.ok();

  s = step("Mobil API: şifre + 2FA ile token, özet ve stok; yanlış token 401");
  const req = op.context().request;
  const bad = await req.post(`${BASE}/api/v1/auth`, {
    data: { email: E.owner.email, password: E.password },
  });
  assert(bad.status() === 401, `2FA'sız ${bad.status()}`);
  const ok = await req.post(`${BASE}/api/v1/auth`, {
    data: {
      email: E.owner.email,
      password: E.password,
      code: totp(E.owner.secret, Date.now() + 30_000),
    },
  });
  assert(ok.ok(), `mobil giriş ${ok.status()}`);
  const { token } = await ok.json();
  const ov = await req.get(`${BASE}/api/v1/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(ov.ok() && (await ov.json()).skus === 1, "mobil özet");
  const st = await (
    await req.get(`${BASE}/api/v1/stock`, { headers: { Authorization: `Bearer ${token}` } })
  ).json();
  assert(st.items[0].sku === "HV-50", "mobil stok");
  // Yönetici web girişinde bu adımın kodunu kullandı; bir sonraki adımın kodu
  const staff = await req.post(`${BASE}/api/v1/auth`, {
    data: {
      email: E.admin.email,
      password: E.password,
      code: totp(E.admin.secret, Date.now() + 30_000),
    },
  });
  assert(staff.status() === 403, `ekip hesabı mobil ${staff.status()}`);
  const nope = await req.get(`${BASE}/api/v1/overview`, {
    headers: { Authorization: "Bearer as_yanlisyanlisyanlisyanlis" },
  });
  assert(nope.status() === 401, "yanlış token");
  s.ok();

  s = step("DATEV dışa aktarımı ve ekip mesaj görünümü");
  const csv = await ap.request.get(
    `${BASE}/admin/disa-aktar/datev?donem=${new Date().toISOString().slice(0, 7)}`,
  );
  assert(csv.ok() && (await csv.text()).includes("Umsatz (ohne Soll/Haben-Kz)"), "DATEV");
  const badPeriod = await ap.request.get(`${BASE}/admin/disa-aktar/datev?donem=2026-13`);
  assert(badPeriod.status() === 400, "geçersiz dönem");
  await ap.goto(`${BASE}/admin/mesajlar`);
  await ap.getByRole("heading", { name: "Yanıt bekleyen mesajlar" }).waitFor();
  s.ok();

  console.log("\nAşama 5 uçtan uca: TÜMÜ GEÇTİ");
} finally {
  await b.close();
}
