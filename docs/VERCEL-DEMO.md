# Vercel demo ortamı

Paylaşılabilir demo adresi içindir. Gerçek müşteri verisi bu projeye girmez.

## Kurulum (bir kez)

1. Vercel → **Add New → Project** → GitHub'dan `gungoryener-source/Avrupadasat` deposunu içe aktarın.
   - Project Name: `avrupadasat-demo`
   - Root Directory: `apps/web` (derleme ve kurulum komutları `apps/web/vercel.json`'dan gelir)
2. **Environment Variables** bölümüne demo .env dosyasının içeriğini yapıştırın (Vercel toplu yapıştırmayı destekler).
   Dosya depoda değildir; Claude'un ürettiği `avrupadasat-demo.env` ya da aynı anahtarlarla kendi değerleriniz.
3. İlk derleme veritabanı olmadığı için hata verebilir. Projede **Storage → Create Database → Neon (Postgres)**,
   bölge Frankfurt, projeye bağlayın. `DATABASE_URL` ve `DATABASE_URL_UNPOOLED` otomatik eklenir.
4. **Deployments → Redeploy**. Derleme sırasında geçişler uygulanır ve demo verisi bir kez yüklenir
   (sonraki derlemelerde "zaten yüklü" diye atlanır).

## Değişkenler

| Değişken                                              | Anlamı                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `DEMO_ENVIRONMENT=1`                                  | Demo ortamı: arama motorlarına kapalı, demo verisine izin                  |
| `DEMO_SEED=1`                                         | Derlemede demo verisini yükle (yalnız boşsa)                               |
| `RUN_MIGRATIONS=1`                                    | Derlemede `prisma migrate deploy`                                          |
| `DEMO_PASSWORD`, `DEMO_ADMIN_TOTP`, `DEMO_OWNER_TOTP` | Demo giriş bilgileri; boşsa rastgele üretilir ve derleme günlüğüne yazılır |
| `STORAGE_DIR=/tmp/...`                                | Yüklenen belgeler geçicidir (demo için yeterli)                            |

## Sınırlar

- Worker (e-posta kuyruğu, zamanlanmış işler) Vercel'de çalışmaz; e-postalar mock modundadır.
- Yüklenen belgeler sunucu yeniden başlayınca silinir.
- Gerçek üretim için ayrı proje, ayrı veritabanı, S3 depolama ve `DEMO_*` değişkenleri olmadan kurulmalıdır.
