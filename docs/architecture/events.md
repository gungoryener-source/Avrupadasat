# Olay kataloğu

Kaynak: `packages/core/src/events.ts` (zod şemaları). Adlandırma: `<alan>.<fiil>.v<sürüm>`; şema değişirse yeni sürüm açılır, eskisi bir süre desteklenir.

| Olay                             | Üreten                | Tüketen (worker)                                  | Yük                                                      |
| -------------------------------- | --------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| `lead.submitted.v1`              | Uygunluk raporu formu | CRM kaydı, onay e-postası                         | firma, e-posta, telefon, kategori, KVKK onayı, UTM/gclid |
| `quote.accepted.v1`              | Teklif onayı          | Onboarding başlatma, kuruluş adımlarının açılması | quoteId, paket                                           |
| `registration.status_changed.v1` | Ekip paneli           | Müşteriye bildirim, bekleme listesi               | adım, durum, not                                         |
| `shipment.status_changed.v1`     | Ekip / partner        | Müşteriye bildirim, panel zaman çizelgesi         | sevkiyat, aşama, zaman                                   |

## Akış

1. İstek, veritabanı değişikliğiyle **aynı işlemde** `OutboxEvent` satırı yazar (`idempotencyKey` benzersiz).
2. Worker `FOR UPDATE SKIP LOCKED` ile toplu çeker; birden fazla worker güvenle çalışır.
3. Başarılıysa `processedAt` yazılır. Geçici hata: en fazla 5 deneme. Şema hatası: yeniden denenmez.
4. Bildirimlerde kişisel veri (e-posta, telefon) loglanmaz.

Dış entegrasyonlar (e-posta, CRM, Amazon, eBay, kargo) `Ports` arayüzü üzerinden; `INTEGRATIONS_MODE=mock` iken yalnız loglanır.
