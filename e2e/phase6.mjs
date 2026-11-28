// Portal uçtan uca: destek (iç not gizliliği), görev akışı, belge onayı, kiracı izolasyonu,
// rol kısıtları, bildirimler ve mobil yerleşim.
import { writeFileSync } from "node:fs";
import { assert, BASE, browser, login, seedE2E, SHOTS, step } from "./lib.mjs";

const E = seedE2E();
const b = await browser();
try {
  const op = await (await b.newContext({ locale: "tr-TR" })).newPage();
  const ap = await (await b.newContext({ locale: "tr-TR" })).newPage();
  const xp = await (await b.newContext({ locale: "tr-TR" })).newPage();
  await login(op, E.owner.email, E.password, E.owner.secret);
  await login(ap, E.admin.email, E.password, E.admin.secret);
  await login(xp, E.other.email, E.password, E.other.secret);

  let s = step("Müşteri destek talebi açar");
  await op.goto(`${BASE}/panel/destek/yeni`);
  await op.getByLabel("Konu").fill("E2E vergi numarası sorusu");
  await op.getByLabel("Kategori").selectOption("VERGI");
  await op.getByLabel("Mesajınız").fill("Vergi numaramız ne zaman gelir, bilgi verebilir misiniz?");
  await op.getByRole("button", { name: "Talebi gönder" }).click();
  await op.waitForURL(/\/panel\/destek\/[^/]+\?yeni=1/);
  const ticketUrl = op.url().split("?")[0];
  const ticketId = ticketUrl.split("/").pop();
  s.ok();

  s = step("Ekip iç not + müşteriye yanıt yazar, talebi günceller");
  await ap.goto(`${BASE}/admin/destek`);
  await ap.getByRole("link", { name: "E2E vergi numarası sorusu" }).click();
  await ap.getByLabel("Yanıt veya iç not").fill("GIZLI-IC-NOT: Steuerberater ile görüşülecek");
  await ap.getByLabel(/İç not olarak kaydet/).check();
  await ap.getByRole("button", { name: "Gönder" }).click();
  await ap.getByText("İç not eklendi").waitFor();
  await ap
    .getByLabel("Yanıt veya iç not")
    .fill("Başvurunuz finans dairesinde, 2-3 hafta içinde bekleniyor.");
  await ap.getByRole("button", { name: "Gönder" }).click();
  await ap.getByText("Yanıt gönderildi").waitFor();
  await ap.getByLabel("Öncelik").selectOption("HIGH");
  await ap.getByRole("button", { name: "Kaydet" }).click();
  await ap.getByText("Talep güncellendi").waitFor();
  s.ok();

  s = step("Müşteri yanıtı görür, iç notu görmez");
  await op.goto(ticketUrl);
  await op.getByText("finans dairesinde").waitFor();
  assert((await op.getByText("GIZLI-IC-NOT").count()) === 0, "iç not müşteriye göründü");
  assert((await op.content()).includes("GIZLI-IC-NOT") === false, "iç not HTML içinde");
  s.ok();

  s = step("Kiracı izolasyonu: başka firma talebi, belgesi ve müşteri detayı");
  const r1 = await xp.goto(`${BASE}/panel/destek/${ticketId}`);
  assert(r1.status() === 404, `başka firma talebi ${r1.status()}`);
  await xp.goto(`${BASE}/panel/destek`);
  assert((await xp.getByText("E2E vergi numarası sorusu").count()) === 0, "liste sızıntısı");
  const r2 = await xp.goto(`${BASE}/admin/destek/${ticketId}`);
  assert(!xp.url().includes("/admin/destek"), `müşteri ekip paneline girdi: ${r2.status()}`);
  s.ok();

  s = step("Ekip müşteriden işlem bekleyen görev oluşturur");
  await ap.goto(`${BASE}/admin/musteriler/${E.tenantId}?sekme=operasyon`);
  await ap.getByLabel("Başlık").fill("E2E imza sirkülerini yükleyin");
  await ap.getByLabel("Açıklama (müşteri görür)").fill("Noter onaylı imza sirküleri gerekiyor.");
  await ap.getByLabel("Müşteriden işlem bekleniyor").check();
  await ap.getByLabel("İç not (müşteri görmez)").fill("GIZLI-GOREV-NOTU");
  await ap.getByRole("button", { name: "Görev oluştur" }).click();
  await ap.getByText("Görev oluşturuldu").waitFor();
  s.ok();

  s = step("Müşteri görevi görür (iç not yok), tamamlar; ekip bildirim alır");
  await op.goto(`${BASE}/panel/gorevler`);
  await op.getByText("E2E imza sirkülerini yükleyin").waitFor();
  assert(!(await op.content()).includes("GIZLI-GOREV-NOTU"), "görev iç notu müşteriye göründü");
  await op.getByPlaceholder("Not (isteğe bağlı)").first().fill("Yükledim");
  await op.getByRole("button", { name: "Yaptım, ekibe bildir" }).first().click();
  await op.getByText("Ekibe iletildi").waitFor();
  await ap.goto(`${BASE}/admin/bildirimler`);
  await ap
    .getByText(/E2E imza sirkülerini yükleyin/)
    .first()
    .waitFor();
  s.ok();

  s = step("Müşteri belge yükler → onay kuyruğu → ret nedeni zorunlu → onay");
  const pdf = `${SHOTS}/e2e-sirkuler.pdf`;
  writeFileSync(pdf, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
  await op.goto(`${BASE}/panel/belgeler`);
  await op.getByLabel("Belge türü").selectOption("SIRKET");
  await op.locator("#file").setInputFiles(pdf);
  await op.getByRole("button", { name: "Yükle", exact: true }).click();
  await op.getByText(/ekibimiz kontrol edip onaylayacak/).waitFor();
  await ap.goto(`${BASE}/admin/belgeler`);
  const row = ap.locator("tbody tr", { hasText: "e2e-sirkuler.pdf" }).first();
  await row.getByRole("button", { name: "Reddet" }).click();
  await ap.getByText("Ret nedeni yazın").waitFor();
  await row.getByRole("button", { name: "Onayla" }).click();
  await ap.getByText("Belge onaylandı.").waitFor();
  await op.goto(`${BASE}/panel/belgeler`);
  await op.locator("tr", { hasText: "e2e-sirkuler.pdf" }).getByText("Onaylandı").waitFor();
  s.ok();

  s = step("Depo personeli (PARTNER) yalnız atandığı firmayı görür");
  const pp = await (await b.newContext({ locale: "tr-TR" })).newPage();
  await login(pp, E.partner.email, E.password, E.partner.secret);
  await pp.goto(`${BASE}/admin/destek`);
  assert(!pp.url().includes("/admin/destek"), "PARTNER destek listesine girdi");
  await pp.goto(`${BASE}/admin/musteriler/${E.otherTenantId}`);
  assert(pp.url().includes("hata=yetki"), "PARTNER başka firmanın detayını açtı");
  await pp.goto(`${BASE}/admin/iadeler`);
  await pp.getByRole("heading", { name: "İadeler" }).waitFor();
  s.ok();

  s = step("Bildirimler: okunmamış sayısı ve tümünü okundu yap");
  await op.goto(`${BASE}/panel/bildirimler`);
  const unread = await op.locator(".sh-bell span").count();
  assert(unread === 1, "zil sayacı yok");
  await op.getByRole("button", { name: "Tümünü okundu yap" }).click();
  await op.waitForTimeout(800);
  await op.reload();
  assert((await op.locator(".sh-bell span").count()) === 0, "sayaç sıfırlanmadı");
  s.ok();

  s = step("Depo: ürün görseli, raf, stok düzeltmesi ve hareket geçmişi");
  await op.goto(`${BASE}/panel/stok`);
  await op.getByLabel("veya yapıştırın").fill("sku;ad\nE2E-RAF;Raf test ürünü");
  await op.getByRole("button", { name: "İçe aktar" }).click();
  await op.getByText("1 ürün eklendi").waitFor();
  await op.getByRole("link", { name: "E2E-RAF" }).click();
  const png = `${SHOTS}/e2e-urun.png`;
  writeFileSync(
    png,
    Buffer.from(
      "89504e470d0a1a0a0000000d4948445200000001000000010806000000" +
        "1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082",
      "hex",
    ),
  );
  await op.locator("#image").setInputFiles(png);
  await op.getByRole("button", { name: "Görsel yükle" }).click();
  await op.getByText("Görsel kaydedildi.").waitFor();
  const img = await op.request.get(
    `${BASE}${await op.locator("img.prod-img").getAttribute("src")}`,
  );
  assert(img.status() === 200 && img.headers()["content-type"] === "image/png", "görsel sunulmadı");
  const foreign = await xp.request.get(
    `${BASE}${await op.locator("img.prod-img").getAttribute("src")}`,
  );
  assert(foreign.status() === 404, `başka firma görseli açtı: ${foreign.status()}`);
  await ap.goto(`${BASE}/admin/musteriler/${E.tenantId}?sekme=depo`);
  await ap.getByLabel("E2E-RAF raf konumu").fill("b-12-1");
  await ap.locator("tr", { hasText: "E2E-RAF" }).getByRole("button", { name: "Kaydet" }).click();
  await ap.getByText("Konum kaydedildi.").waitFor();
  await ap.locator("tr", { hasText: "E2E-RAF" }).locator("summary").click();
  await ap.locator("#qty-E2E-RAF").fill("25");
  await ap.locator("#note-E2E-RAF").fill("Açılış sayımı");
  await ap.getByRole("button", { name: "Stoğu güncelle" }).click();
  await ap.getByText("Stok güncellendi").waitFor();
  await op.goto(`${BASE}/panel/stok?sekme=hareket`);
  await op.getByText("Açılış sayımı").waitFor();
  await op.getByText("Konum: — → B-12-1").waitFor();
  await op.goto(`${BASE}/panel/stok`);
  const r = op.getByRole("row", { name: /E2E-RAF/ });
  assert((await r.textContent()).includes("B-12-1"), "raf görünmüyor");
  s.ok();

  s = step("Barkod: etiket kodu, etiket PDF'i ve okutma (kiracı izolasyonu dahil)");
  await op.getByRole("link", { name: "E2E-RAF" }).click();
  const code = (await op.locator(".lbl-code").textContent()).trim();
  assert(/^D[0-9A-HJKMNP-TV-Z]{7}$/.test(code), `etiket kodu biçimi: ${code}`);
  const pid = op.url().split("/").pop().split("?")[0];
  const lbl = await op.request.get(`${BASE}/api/etiket?u=${pid}:3&bicim=termal`);
  assert(
    lbl.status() === 200 && lbl.headers()["content-type"] === "application/pdf",
    `etiket PDF'i: ${lbl.status()}`,
  );
  assert((await lbl.body()).subarray(0, 5).toString() === "%PDF-", "PDF değil");
  const a4 = await op.request.get(`${BASE}/api/etiket?n_${pid}=30&bicim=a4`);
  assert(a4.status() === 200, `A4 etiket: ${a4.status()}`);
  const bad = await op.request.get(`${BASE}/api/etiket?u=${pid}:9999`);
  assert(bad.status() === 400, `adet sınırı: ${bad.status()}`);
  const xpdf = await xp.request.get(`${BASE}/api/etiket?u=${pid}:1`);
  assert(xpdf.status() === 404, `başka firma etiket bastı: ${xpdf.status()}`);
  const own = await (await op.request.get(`${BASE}/api/okut?kod=${code.toLowerCase()}`)).json();
  assert(
    own.by === "code" && own.hits.length === 1 && own.hits[0].sku === "E2E-RAF",
    `okutma: ${JSON.stringify(own)}`,
  );
  assert(own.hits[0].location === "B-12-1", "okutmada raf yok");
  const other = await (await xp.request.get(`${BASE}/api/okut?kod=${code}`)).json();
  assert(other.hits.length === 0, "başka firmanın ürünü okutmada göründü");
  await ap.goto(`${BASE}/admin/okut`);
  await ap.getByLabel("Barkodu okutun veya kodu yazın").fill(code);
  await ap.keyboard.press("Enter");
  const hit = ap.locator(".scan-hit", { hasText: "Raf test ürünü" });
  await hit.waitFor();
  assert((await hit.textContent()).includes("B-12-1"), "ekip okutmasında raf yok");
  await ap.getByLabel("Barkodu okutun veya kodu yazın").fill("YOK-BOYLE-BIR-KOD");
  await ap.keyboard.press("Enter");
  await ap.getByText("için ürün bulunamadı").waitFor();
  await ap.screenshot({ path: `${SHOTS}/61-barkod-okut.png` });
  await op.goto(`${BASE}/panel/stok?q=${code}`);
  await op.getByRole("row", { name: /E2E-RAF/ }).waitFor();
  await op.goto(`${BASE}/panel/stok/etiketler`);
  await op.getByLabel("E2E-RAF etiket adedi").fill("2");
  await op.screenshot({ path: `${SHOTS}/62-etiket-bas.png` });
  s.ok();

  s = step("Mobil yerleşim: menü çekmecesi ve taşma yok");
  const mp = await (
    await b.newContext({ locale: "tr-TR", viewport: { width: 390, height: 844 } })
  ).newPage();
  await login(mp, E.owner.email, E.password, E.owner.secret);
  for (const path of [
    "/panel",
    "/panel/destek",
    "/panel/belgeler",
    "/panel/siparisler",
    "/panel/stok/etiketler",
    "/panel/stok/okut",
  ]) {
    await mp.goto(`${BASE}${path}`);
    const w = await mp.evaluate(() => document.documentElement.scrollWidth);
    assert(w <= 392, `${path} yatay taşma: ${w}px`);
  }
  await mp.getByRole("button", { name: /Menü/ }).click();
  await mp.getByRole("link", { name: "Destek Merkezi" }).click();
  await mp.waitForURL(/\/panel\/destek/);
  await mp.screenshot({ path: `${SHOTS}/60-mobil-destek.png` });
  s.ok();
  console.log("Aşama 6 uçtan uca: TÜMÜ GEÇTİ");
} finally {
  await b.close();
}
