// Aşama 4 uçtan uca: satış kilidi, Amazon (demo) siparişleri, kargo, iade, fatura, skor kartı
import { assert, BASE, browser, login, seedE2E, SHOTS, step } from "./lib.mjs";

const E = seedE2E();
const b = await browser();
try {
  const oc = await b.newContext({ locale: "tr-TR" });
  const op = await oc.newPage();
  const ac = await b.newContext({ locale: "tr-TR" });
  const ap = await ac.newPage();

  let s = step("Hazırlık: katalog (müşteri), stok sayımı ve palet (ekip)");
  await login(op, E.owner.email, E.password, E.owner.secret);
  await op.goto(`${BASE}/panel/stok`);
  await op.getByLabel("veya yapıştırın").fill("sku;ad\nHV-50;Havlu 50x90\nHV-70;Havlu 70x140");
  await op.getByRole("button", { name: "İçe aktar" }).click();
  await op.getByText("2 ürün eklendi").waitFor();
  await login(ap, E.admin.email, E.password, E.admin.secret);
  await ap.goto(`${BASE}/admin/musteriler/${E.tenantId}`);
  await ap.getByLabel("Sayım CSV").fill("sku;miktar\nHV-50;20\nHV-70;5");
  await ap.getByRole("button", { name: "Sayımı işle" }).click();
  await ap.getByLabel("Kullanılan palet").fill("4");
  await ap.getByRole("button", { name: "Kaydet", exact: true }).first().waitFor();
  await ap.locator('form:has(input[name="pallets"]) button').click();
  await ap.waitForTimeout(500);
  s.ok();

  s = step("Satış kilidi: vergi numaraları gelmeden kanal bağlanamıyor");
  await op.goto(`${BASE}/panel/siparisler`);
  await op.getByText("Satış kanalları vergi numaraları tamamlanınca bağlanabilir").waitFor();
  s.ok();

  s = step("Ekip vergi no ve USt-IdNr adımlarını tamamlıyor → kilit açılıyor");
  await ap.goto(`${BASE}/admin/musteriler/${E.tenantId}`);
  for (const step of ["VERGI_NO", "UST_ID"]) {
    const form = ap.locator(`form:has(input[name="step"][value="${step}"])`);
    await form.locator('select[name="status"]').selectOption("TAMAM");
    await form.getByRole("button", { name: "Kaydet" }).click();
    await ap.waitForTimeout(600);
  }
  await op.goto(`${BASE}/panel/siparisler`);
  await op.getByRole("button", { name: "Bağla" }).first().waitFor();
  s.ok();

  s = step("Amazon (demo) bağlanıyor, siparişler çekiliyor ve stok rezerve ediliyor");
  await op
    .locator('form:has(input[value="AMAZON"])')
    .getByRole("button", { name: "Bağla" })
    .click();
  await op.getByText("Bağlı (demo)").waitFor();
  await op.getByRole("button", { name: "Siparişleri şimdi çek" }).click();
  await op.getByText("Hazırlanıyor").first().waitFor();
  const orderRows = await op.locator("tbody tr", { hasText: "Amazon.de" }).count();
  assert(orderRows === 3, `sipariş sayısı ${orderRows}`);
  await op.goto(`${BASE}/panel/stok`);
  const reserved = Number(
    (await op.getByRole("row", { name: /HV-50/ }).locator("td").nth(4).textContent()).trim(),
  );
  assert(reserved > 0, "rezervasyon yok");
  s.ok();

  s = step("Ekip ilk siparişi kargoluyor (geçersiz takip no reddediliyor)");
  await ap.goto(`${BASE}/admin/siparisler`);
  const first = ap.locator("tbody tr", { hasText: "E2E Tekstil" }).first();
  const ext = (await first.locator(".mono").first().textContent()).trim();
  await first.getByLabel(`${ext} takip no`).fill("x");
  await first.getByRole("button", { name: "Kargolandı" }).click();
  await ap.waitForTimeout(800);
  assert((await ap.getByText(ext).count()) === 1, "geçersiz takip no kabul edildi");
  const row = ap.locator("tbody tr", { hasText: ext });
  await row.getByLabel(`${ext} takip no`).fill("00340434161234567890");
  await row.getByRole("button", { name: "Kargolandı" }).click();
  await ap.waitForTimeout(800);
  assert((await ap.getByText(ext).count()) === 0, "sipariş kuyrukta kaldı");
  await op.goto(`${BASE}/panel/siparisler`);
  await op.getByText("DHL 00340434161234567890").waitFor();
  s.ok();

  s = step("İade kaydı ve işleme (satılabilir → stoğa dönüyor)");
  await ap.goto(`${BASE}/admin/siparisler`);
  await ap.getByLabel("Firma").selectOption({ label: "E2E Tekstil" });
  await ap.getByLabel("SKU").fill("HV-70");
  await ap.getByLabel("Neden").fill("Renk farklı");
  await ap.getByRole("button", { name: "İadeyi kaydet" }).click();
  await ap.getByLabel("HV-70 durum").waitFor();
  await ap.getByLabel("HV-70 durum").selectOption("SELLABLE");
  await ap
    .locator('form:has(select[aria-label="HV-70 durum"])')
    .getByRole("button", { name: "İşle" })
    .click();
  await ap.waitForTimeout(800);
  await op.goto(`${BASE}/panel/siparisler`);
  await op.getByText("Satılabilir").waitFor();
  s.ok();

  s = step("Masraf yansıtma + aylık taslak + fatura kesme + PDF");
  await ap.goto(`${BASE}/admin/faturalar`);
  await ap.getByLabel("Firma").selectOption({ label: "E2E Tekstil" });
  await ap.getByLabel("Açıklama").fill("DHL kargo masrafı");
  await ap.getByLabel("Tutar (€)").fill("18.40");
  await ap.getByRole("button", { name: "Ekle" }).click();
  await ap.getByText(/Faturalanmamış: .*DHL kargo masrafı/).waitFor();
  await ap.getByRole("button", { name: "Taslakları oluştur" }).click();
  const invRow = ap.locator("tbody tr", { hasText: "E2E Tekstil" }).first();
  await invRow.getByRole("button", { name: "Kes" }).click();
  await ap.locator("tbody tr", { hasText: "E2E Tekstil" }).first().getByText("Kesildi").waitFor();
  const pdfHref = await ap
    .locator("tbody tr", { hasText: "E2E Tekstil" })
    .first()
    .getByRole("link", { name: "PDF" })
    .getAttribute("href");
  const pdf = await ap.request.get(`${BASE}${pdfHref}`);
  assert(pdf.ok() && (await pdf.body()).subarray(0, 5).toString() === "%PDF-", "fatura PDF");
  await ap.screenshot({ path: `${SHOTS}/30-admin-invoices.png`, fullPage: true });
  s.ok();

  s = step("Müşteri faturasını görüyor; oturumsuz PDF isteği reddediliyor");
  await op.goto(`${BASE}/panel/faturalar`);
  await op.getByText(/AS-R-\d{4}-\d{5}/).waitFor();
  const own = await op.request.get(`${BASE}${pdfHref}`);
  assert(own.ok(), "müşteri kendi faturasını indiremedi");
  const anon = await (await b.newContext()).request.get(`${BASE}${pdfHref}`);
  assert(anon.status() === 401, `oturumsuz fatura ${anon.status()}`);
  const oc2 = await b.newContext({ locale: "tr-TR" });
  const other = await oc2.newPage();
  await login(other, E.other.email, E.password, E.other.secret);
  const foreign = await other.request.get(`${BASE}${pdfHref}`);
  assert(foreign.status() === 404, `başka firma faturası: ${foreign.status()}`);
  s.ok();

  s = step("Skor kartı ekipte görünüyor, partnere kapalı; cron gizli anahtarsız 401");
  await ap.goto(`${BASE}/admin/partnerler`);
  await ap.getByText("Depo Partner").waitFor();
  const pc = await b.newContext({ locale: "tr-TR" });
  const pp = await pc.newPage();
  await login(pp, E.partner.email, E.password, E.partner.secret);
  await pp.goto(`${BASE}/admin/partnerler`);
  assert(!pp.url().endsWith("/admin/partnerler"), "partner skor kartını görüyor");
  const cron = await pp.request.post(`${BASE}/api/cron/sync`, {
    headers: { Authorization: "Bearer yanlis" },
  });
  assert(cron.status() === 401, `cron ${cron.status()}`);
  s.ok();

  console.log("\nAşama 4 uçtan uca: TÜMÜ GEÇTİ");
} finally {
  await b.close();
}
