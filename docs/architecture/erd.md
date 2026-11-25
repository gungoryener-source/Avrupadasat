# Veri modeli

Kaynak: `packages/db/prisma/schema.prisma` (7 migration).

| Alan      | Modeller                                                             | Tenant kapsamı                            |
| --------- | -------------------------------------------------------------------- | ----------------------------------------- |
| Kimlik    | User, Session, AuthToken, ApiToken, RateLimit                        | sistem                                    |
| Firma     | Tenant, Membership, PartnerAssignment, TenantContact                 | Membership/Partner/Contact **zorunlu**    |
| CRM       | Lead, Quote, Contract                                                | Contract **zorunlu**                      |
| Kuruluş   | RegistrationTask                                                     | **zorunlu**                               |
| Lojistik  | Shipment, ShipmentEvent, AsnLine, Document, StockItem, StockMovement | **zorunlu**                               |
| Satış     | MarketplaceConnection, Order, OrderLine, WorkOrder, ReturnItem       | **zorunlu**                               |
| Finans    | Invoice, Disbursement, StorageSnapshot, PriceList                    | Invoice/Disbursement/Snapshot **zorunlu** |
| Otomasyon | CustomerMessage, ProductContent                                      | **zorunlu**                               |
| Sistem    | OutboxEvent, AuditLog, ConsentRecord                                 | sistem                                    |

## Şifreli alanlar (AES-256-GCM, `FIELD_ENCRYPTION_KEY`)

Tenant.taxNumberEnc, Tenant.ibanEnc, User.twoFactorSecretEnc, Order.shipToEnc (alıcı adı ve adresi), MarketplaceConnection.credentialsEnc.

## Yalnız hash'i saklananlar

Session.tokenHash, AuthToken.tokenHash, ApiToken.tokenHash, Quote.publicTokenHash, ConsentRecord.ipHash (günlük tuzlu).

## İzolasyon kuralı

Müşteri verisine erişen kod `forTenant(prisma, tenantId)` kullanır: okuma/güncelleme/silmeye `tenantId` eklenir, başka firma id'si verilirse `TenantScopeError`, oluşturmada `tenantId` zorlanır, ham SQL ve kapsam dışı modeller kapalıdır. Ekip sayfalarında ayrıca `canAccessTenant(actor, tenantId)` (partner yalnız atandığı firmalar).
