# Olay kataloğu

Kaynak: `packages/core/src/events.ts` (zod şemaları). Adlandırma: `<alan>.<fiil>.v<sürüm>`.

| Olay                             | Üreten                                     | Tüketen (worker)                                    |
| -------------------------------- | ------------------------------------------ | --------------------------------------------------- |
| `lead.submitted.v1`              | Uygunluk raporu formu                      | CRM bildirimi, onay e-postası                       |
| `user.invited.v1`                | Teklif onayı, ekip daveti, şifre sıfırlama | Davet / sıfırlama e-postası (token şifreli taşınır) |
| `quote.sent.v1`                  | Ekip: teklif gönder                        | Teklif bağlantılı e-posta (token şifreli)           |
| `quote.accepted.v1`              | Müşteri: çevrimiçi onay                    | Onboarding bildirimi                                |
| `registration.status_changed.v1` | Ekip: kuruluş adımı                        | Müşteriye bildirim                                  |
| `shipment.status_changed.v1`     | Ekip/partner: aşama, mal kabul             | Müşteriye bildirim                                  |
| `order.created.v1`               | Sipariş içe aktarma                        | (raporlama)                                         |
| `order.shipped.v1`               | Kargo                                      | (raporlama; takip pazaryerine doğrudan iletilir)    |
| `return.processed.v1`            | İade işleme                                | (raporlama)                                         |
| `invoice.issued.v1`              | Fatura kesme                               | Fatura e-postası                                    |

## Akış

1. İstek, veritabanı değişikliğiyle **aynı işlemde** `OutboxEvent` yazar (`idempotencyKey` benzersiz).
2. Worker `FOR UPDATE SKIP LOCKED` ile toplu çeker.
3. Başarılıysa `processedAt`; geçici hata 5 denemeye kadar; şema hatası yeniden denenmez.
4. Bildirimlerde kişisel veri loglanmaz; ham token outbox'a yazılmaz.
