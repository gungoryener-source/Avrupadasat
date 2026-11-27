// Aşama 3 uçtan uca: müşteri paneli, ASN, belgeler, mal kabul, partner kapsamı, izolasyon
import { assert, BASE, browser, login, seedE2E, SHOTS, step } from "./lib.mjs";

const E = seedE2E();

// Test dosyaları bellekte üretilir (diske/ortama bağımlılık yok)
const FAKE_PDF_EXE = {
  name: "fatura.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]), // "MZ": Windows çalıştırılabilir başlığı
};
const REAL_PDF = {
  name: "atr.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"),
};
const b = await browser();
try {
  const oc = await b.newContext({ locale: "tr-TR", acceptDownloads: true });
  const op = await oc.newPage();

  let s = step("Firma sahibi giriş yapıyor; satış kilidi ve bekleme listesi görünüyor");
  await login(op, E.owner.email, E.password, E.owner.secret);
  await op.getByText("Satış ve ödeme adımları vergi kayıtları tamamlanınca açılacak").waitFor();
  await op.getByText("Ürün kartlarınızı yükleyin").waitFor();
  s.ok();

  s = step("Katalog içe aktarma (hatalı satır raporlanıyor)");
  await op.goto(`${BASE}/panel/stok`);
  await op
    .getByLabel("veya yapıştırın")
    .fill("sku;ad;ean\nHV-50;Havlu 50x90 beyaz;8690000000011\nHV-70;Havlu 70x140 gri;\nBOZUK;;");
  await op.getByRole("button", { name: "İçe aktar" }).click();
  await op.getByText("2 ürün eklendi, 0 ürün güncellendi.").waitFor();
  await op.getByText(/ürün adı eksik/).waitFor();
  s.ok();

  s = step("ASN oluşturuluyor; eksik belge uyarısı çıkıyor");
  await op.goto(`${BASE}/panel/sevkiyatlar`);
  await op.getByLabel("Sevkiyat referansı").fill("E2E-ASN-1");
  await op.getByLabel("Palet").fill("2");
  await op.getByLabel("Koli").fill("30");
  await op.getByLabel("Ürünler (her satır: SKU;adet)").fill("HV-50;200\nHV-70;100");
  await op.getByRole("button", { name: "Sevkiyatı bildir" }).click();
  await op.waitForURL(/\/panel\/sevkiyatlar\/[a-z0-9]+$/);
  const shipmentUrl = op.url();
  await op.getByText(/Eksik: Ticari fatura, Çeki listesi, A\.TR/).waitFor();
  s.ok();

  s = step("Belge yükleme: sahte PDF (EXE) reddediliyor, gerçek PDF kabul ediliyor");
  await op.getByLabel("Belge türü").selectOption("TICARI_FATURA");
  await op.locator('input[name="file"]').setInputFiles(FAKE_PDF_EXE);
  await op.getByRole("button", { name: "Yükle" }).click();
  await op.getByText(/Desteklenmeyen dosya türü/).waitFor();
  await op.getByLabel("Belge türü").selectOption("ATR");
  await op.locator('input[name="file"]').setInputFiles(REAL_PDF);
  await op.getByRole("button", { name: "Yükle" }).click();
  await op.getByText(/Belge yüklendi/).waitFor();
  await op.reload();
  const missText = await op.locator(".alert-err").first().textContent();
  assert(
    missText.startsWith("Eksik:") && !missText.includes("A.TR"),
    `A.TR hâlâ eksik: ${missText}`,
  );
  s.ok();

  s = step("İmzalı indirme: geçerli bağlantı iniyor, imzası bozuk bağlantı 403, oturumsuz 401");
  const href = await op.getByRole("link", { name: "atr.pdf" }).getAttribute("href");
  const ok = await op.request.get(`${BASE}${href}`);
  assert(
    ok.status() === 200 && ok.headers()["content-disposition"].startsWith("attachment"),
    `indirme ${ok.status()}`,
  );
  assert((await ok.body()).subarray(0, 5).toString() === "%PDF-", "içerik");
  const bad = await op.request.get(`${BASE}${href.replace(/s=[^&]+/, "s=bozuk")}`);
  assert(bad.status() === 403, `bozuk imza ${bad.status()}`);
  const anon = await (await b.newContext()).request.get(`${BASE}${href}`);
  assert(anon.status() === 401, `oturumsuz ${anon.status()}`);
  await op.screenshot({ path: `${SHOTS}/20-panel-shipment.png`, fullPage: true });
  s.ok();

  s = step("Başka firmanın sevkiyatı müşteriye görünmüyor (404)");
  const r404 = await op.goto(`${BASE}/panel/sevkiyatlar/${E.otherShipmentId}`);
  assert(r404.status() === 404, `başka firma sevkiyatı: ${r404.status()}`);
  s.ok();

  s = step("Ekip daveti");
  await op.goto(`${BASE}/panel/kullanicilar`);
  await op.getByLabel("Ad soyad").fill("Murat Ekip");
  await op.getByLabel("E-posta").fill(`murat-${Date.now()}@tekstil.test`);
  await op.getByRole("button", { name: "Davet et" }).click();
  await op.getByText("Davet gönderildi.").waitFor();
  await op.getByText("Davet bekliyor").waitFor();
  s.ok();

  s = step("Partner yalnız atandığı firmayı görüyor, diğer firmanın sevkiyatına giremiyor");
  const pc = await b.newContext({ locale: "tr-TR" });
  const pp = await pc.newPage();
  await login(pp, E.partner.email, E.password, E.partner.secret);
  await pp.goto(`${BASE}/admin/sevkiyatlar`);
  await pp.getByRole("link", { name: "E2E-ASN-1" }).waitFor();
  assert((await pp.getByText("GIZLI-1").count()) === 0, "partner diğer firmayı görüyor");
  await pp.goto(`${BASE}/admin/sevkiyatlar/${E.otherShipmentId}`);
  assert(!pp.url().includes(E.otherShipmentId), "partner başka firmanın sevkiyatına girdi");
  await pp.goto(`${BASE}/admin/talepler`);
  assert(!pp.url().endsWith("/admin/talepler"), "partner talepleri görebiliyor");
  s.ok();

  s = step("Partner aşamayı güncelleyip mal kabulü yapıyor (2 hasarlı)");
  await pp.goto(`${BASE}/admin/sevkiyatlar`);
  await pp.getByRole("link", { name: "E2E-ASN-1" }).click();
  await pp.getByLabel("Aşama", { exact: true }).selectOption("GUMRUK");
  await pp.getByLabel("Not (müşteri görür)").fill("Gümrük beyannamesi açıldı");
  await pp.getByRole("button", { name: "Kaydet ve müşteriye bildir" }).click();
  await pp.getByText("Gümrük beyannamesi açıldı").waitFor();
  await pp.getByLabel("HV-50 sayılan").fill("198");
  await pp.getByLabel("HV-50 hasarlı").fill("2");
  await pp.getByRole("button", { name: /Mal kabulü tamamla/ }).click();
  await pp.getByText("Mal kabul tamamlandı").waitFor();
  s.ok();

  s = step("Müşteri stoğu ve farkları görüyor; CSV dışa aktarma çalışıyor");
  await op.goto(shipmentUrl);
  await op.getByText("Mal kabul tamamlandı").waitFor();
  await op.goto(`${BASE}/panel/stok`);
  const row = op.getByRole("row", { name: /HV-50/ });
  assert((await row.textContent()).includes("196"), `stok: ${await row.textContent()}`);
  const csv = await op.request.get(`${BASE}/panel/stok/csv`);
  assert((await csv.text()).includes("HV-50;Havlu 50x90 beyaz;8690000000011;196"), "CSV içeriği");
  // KTÜN (GTIN) bazlı aylık rapor: bu ayın mal kabulü görünür; oturumsuz erişim yok; dönem doğrulanır
  const month = new Date().toISOString().slice(0, 7);
  const ktun = await op.request.get(`${BASE}/panel/stok/ktun?donem=${month}`);
  const ktunText = await ktun.text();
  assert(ktun.status() === 200 && ktunText.includes("KTÜN (GTIN)"), `KTÜN raporu ${ktun.status()}`);
  assert(/8690000000011;(evet|hayır);HV-50;Havlu 50x90 beyaz;/.test(ktunText), "KTÜN satırı");
  assert(
    (await op.request.get(`${BASE}/panel/stok/ktun?donem=2026-13`)).status() === 400,
    "geçersiz dönem",
  );
  const anonKtun = await (
    await b.newContext()
  ).request.get(`${BASE}/panel/stok/ktun?donem=${month}`, {
    maxRedirects: 0,
  });
  assert([303, 307, 308].includes(anonKtun.status()), `oturumsuz KTÜN ${anonKtun.status()}`);
  await op.screenshot({ path: `${SHOTS}/21-panel-stock.png`, fullPage: true });
  s.ok();

  s = step("Ekip panelinde audit: belge indirme ve veri dışa aktarma kayıtlı");
  const ac = await b.newContext({ locale: "tr-TR" });
  const ap = await ac.newPage();
  await login(ap, E.admin.email, E.password, E.admin.secret);
  await ap.goto(`${BASE}/admin/audit?eylem=document.`);
  await ap.getByText("document.downloaded").first().waitFor();
  await ap.goto(`${BASE}/admin/audit?eylem=data.`);
  await ap.getByText("data.exported").first().waitFor();
  s.ok();

  console.log("\nAşama 3 uçtan uca: TÜMÜ GEÇTİ");
} finally {
  await b.close();
}
