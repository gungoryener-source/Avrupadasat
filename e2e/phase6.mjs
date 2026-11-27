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

  s = step("Mobil yerleşim: menü çekmecesi ve taşma yok");
  const mp = await (
    await b.newContext({ locale: "tr-TR", viewport: { width: 390, height: 844 } })
  ).newPage();
  await login(mp, E.owner.email, E.password, E.owner.secret);
  for (const path of ["/panel", "/panel/destek", "/panel/belgeler", "/panel/siparisler"]) {
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
