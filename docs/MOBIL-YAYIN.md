# Mobil uygulama — mağaza yayını kontrol listesi

Kod tarafı hazır: EAS profilleri (`apps/mobile/eas.json`), simgeler, gizlilik manifesti, anlık bildirimler. Aşağıdaki adımlar hesap sahibi tarafından yapılır (hesaplar ve ödemeler kişiye/şirkete bağlıdır).

## 1. Hesaplar

- [ ] Expo hesabı → `cd apps/mobile && npx eas init` (çıkan `projectId` otomatik olarak `app.json → extra.eas.projectId` alanına yazılır; anlık bildirim anahtarı bu olmadan alınamaz)
- [ ] Apple Developer Program (şirket adına; D-U-N-S numarası gerekir) — yıllık ücret
- [ ] Google Play Console (şirket hesabı; kimlik doğrulama birkaç gün sürebilir) — tek seferlik ücret
- [ ] Expo push güvenliği: Expo panelinde "Enhanced Security for Push Notifications" açılır, erişim anahtarı worker ortamına `EXPO_ACCESS_TOKEN` olarak girilir

## 2. Kimlik bilgileri

- iOS: `eas credentials` → dağıtım sertifikası ve APNs anahtarı EAS tarafından yönetilir
- Android: `eas credentials` → yükleme anahtarı EAS'ta; FCM v1 hizmet hesabı JSON'u yüklenir (bildirimler için)
- Hiçbir anahtar repoya girmez.

## 3. Derleme ve gönderim

```bash
cd apps/mobile
pnpm build:preview   # dahili test (Android APK, iOS ad-hoc)
pnpm build:prod      # mağaza derlemesi (sürüm numarası otomatik artar)
pnpm submit:prod     # Android: dahili test kanalı (taslak), iOS: TestFlight
```

## 4. Mağaza bilgileri (taslak — onaylanmalı)

- **Ad:** marka adı (`brand.config.ts`) · **Kategori:** İş (Business)
- **Kısa açıklama:** Almanya'daki stok, sevkiyat ve siparişlerinizi tek yerden izleyin.
- **Hedef kitle:** Platformla sözleşmesi olan firmalar; uygulamada kayıt yok, hesap web panelinden açılır. İnceleme ekibi için **demo müşteri hesabı** (2FA'sız, demo verili, ayrı tenant) hazırlanmalı — üretim verisine erişimi olmamalı.
- **Ekran görüntüleri:** 6,7" ve 6,5" iPhone, Android telefon (demo hesabından; gerçek müşteri verisi kullanılmaz)
- **Gizlilik politikası URL'si:** sitedeki gizlilik sayfası (avukat onaylı son hâli)
- **Hesap silme:** Google Play ve App Store, hesap silme yolunu ister → web panelindeki talep yolu veya destek e-postası belirtilir (⚠️ panelde self-servis silme yok; avukatla birlikte süreç tanımlanmalı)

## 5. Gizlilik etiketleri (App Store "App Privacy" / Play "Data safety") — taslak

| Veri                              | Toplanıyor | Kimliğe bağlı | İzleme | Amaç                       |
| --------------------------------- | ---------- | ------------- | ------ | -------------------------- |
| E-posta adresi                    | Evet       | Evet          | Hayır  | Uygulama işlevi (giriş)    |
| Cihaz kimliği (bildirim anahtarı) | Evet       | Evet          | Hayır  | Uygulama işlevi (bildirim) |
| Konum, kişiler, fotoğraf, sağlık  | Hayır      | —             | —      | —                          |
| Analitik / reklam SDK'sı          | Yok        | —             | —      | —                          |

- Aktarım TLS ile şifreli; oturum anahtarı cihazda Keychain/Keystore'da.
- Kullanıcı verileri üçüncü taraflarla paylaşılmaz (Expo Push Service yalnız bildirim iletimi için işleyen sıfatıyla) — hukuki ifade avukatla netleştirilmeli.
- iOS gizlilik manifesti `app.json → ios.privacyManifests` içinde aynı bilgilerle tanımlı; Expo modüllerinin kendi manifestleri derlemede birleştirilir.

## 6. Yayın öncesi son kontrol

- [ ] `extra.apiUrl` üretim alan adını gösteriyor (HTTPS)
- [ ] Simgeler geçici tasarım — kurumsal kimlik gelince `assets/` altındaki dosyalar değiştirilir (1024×1024 simge, adaptif ön plan, 96×96 beyaz bildirim simgesi)
- [ ] Gerçek cihazda: giriş + 2FA, bildirim izni, bildirime dokununca ilgili sekmenin açılması, çıkışta bildirimlerin durması
- [ ] Şifreleme beyanı: yalnız standart HTTPS → `ITSAppUsesNonExemptEncryption = false` (tanımlı)
