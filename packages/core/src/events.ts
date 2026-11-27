/**
 * Olay kataloğu. Olaylar outbox tablosuna yazılır, worker tarafından işlenir.
 * Adlandırma: <alan>.<geçmiş zaman fiil>.v<sürüm>  — şema değişirse yeni sürüm açılır.
 */
import { z } from "zod";
import { productCategories } from "./categories";

export { productCategories };

export const attribution = z.object({
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(200).optional(),
  gclid: z.string().max(200).optional(),
  fbclid: z.string().max(200).optional(),
  landingPath: z.string().max(300).optional(),
});

/** Ücretsiz uygunluk raporu / ön değerlendirme formu */
/** Çok adımlı uygunluk formunun ek yanıtları (hepsi isteğe bağlı; eski formlar göndermez) */
export const leadChannels = ["amazon", "ebay", "webshop", "b2b", "unsure"] as const;
export const leadExportStatuses = ["none", "non_eu", "eu_parcel", "eu_bulk"] as const;
export const leadProfile = z
  .object({
    contactName: z.string().trim().max(120),
    city: z.string().trim().max(80),
    website: z.string().trim().max(200),
    channels: z.array(z.enum(leadChannels)).max(leadChannels.length),
    exportStatus: z.enum(leadExportStatuses),
  })
  .partial();

export const leadSubmittedV1 = z.object({
  companyName: z.string().trim().min(2).max(200),
  email: z.email().max(254),
  phone: z.string().trim().min(7).max(30),
  category: z.enum(productCategories),
  consentKvkk: z.literal(true),
  marketingConsent: z.boolean().default(false),
  attribution: attribution.default({}),
  profile: leadProfile.optional(),
});

export const quoteAcceptedV1 = z.object({
  quoteId: z.string(),
  packageCode: z.enum(["BASLANGIC", "OPERASYON", "PAZARA_GIRIS"]),
});

export const registrationSteps = [
  "VEKALETNAME",
  "APOSTIL",
  "NOTER",
  "TICARET_SICILI",
  "VERGI_NO",
  "UST_ID",
  "EORI",
  "LUCID",
] as const;

export const registrationStatusChangedV1 = z.object({
  step: z.enum(registrationSteps),
  status: z.enum(["BEKLIYOR", "SURUYOR", "TAMAM", "SORUN"]),
  note: z.string().max(500).optional(),
});

export const shipmentStages = ["FABRIKA", "TR_CIKIS", "AB_GIRIS", "GUMRUK", "DEPO_KABUL"] as const;

export const shipmentStatusChangedV1 = z.object({
  shipmentId: z.string(),
  stage: z.enum(shipmentStages),
  at: z.iso.datetime(),
});

/**
 * Bağlantı içeren e-postalar: ham token outbox'a YAZILMAZ; FIELD_ENCRYPTION_KEY ile şifreli taşınır.
 */
export const userInvitedV1 = z.object({
  userId: z.string(),
  email: z.email(),
  purpose: z.enum(["INVITE", "PASSWORD_RESET"]),
  tokenEnc: z.string(),
});

export const quoteSentV1 = z.object({
  quoteId: z.string(),
  number: z.string(),
  email: z.email(),
  tokenEnc: z.string(),
});

export const orderCreatedV1 = z.object({
  orderId: z.string(),
  channel: z.string(),
  status: z.string(),
});
export const orderShippedV1 = z.object({
  orderId: z.string(),
  channel: z.string(),
  carrier: z.string(),
  trackingNo: z.string(),
});
export const returnProcessedV1 = z.object({
  returnId: z.string(),
  sku: z.string(),
  condition: z.enum(["SELLABLE", "REPACK", "DAMAGED"]),
});
export const invoiceIssuedV1 = z.object({
  invoiceId: z.string(),
  number: z.string(),
  grossCents: z.number().int(),
});

/** Son firma sahibi hesabını sildi: firma verisinin akıbeti (yasal saklama) ekip tarafından karara bağlanır */
export const accountDeletionRequestedV1 = z.object({
  reason: z.enum(["last_owner_deleted"]),
});

/** Uygulama içi bildirimin e-posta kopyası (worker gönderir) */
export const notificationEmailV1 = z.object({
  email: z.email(),
  subject: z.string().max(200),
  body: z.string().max(2000).optional(),
  href: z.string().max(300).optional(),
});

export const eventSchemas = {
  "account.deletion_requested.v1": accountDeletionRequestedV1,
  "order.created.v1": orderCreatedV1,
  "order.shipped.v1": orderShippedV1,
  "return.processed.v1": returnProcessedV1,
  "invoice.issued.v1": invoiceIssuedV1,
  "lead.submitted.v1": leadSubmittedV1,
  "notification.email.v1": notificationEmailV1,
  "user.invited.v1": userInvitedV1,
  "quote.sent.v1": quoteSentV1,
  "quote.accepted.v1": quoteAcceptedV1,
  "registration.status_changed.v1": registrationStatusChangedV1,
  "shipment.status_changed.v1": shipmentStatusChangedV1,
} as const;

export type EventType = keyof typeof eventSchemas;
export type EventPayload<T extends EventType> = z.infer<(typeof eventSchemas)[T]>;

export interface EventEnvelope<T extends EventType = EventType> {
  id: string;
  type: T;
  tenantId: string | null;
  occurredAt: string;
  /** Aynı isteğin iki kez işlenmesini önler */
  idempotencyKey: string;
  payload: EventPayload<T>;
}

export function parseEvent<T extends EventType>(type: T, payload: unknown): EventPayload<T> {
  return eventSchemas[type].parse(payload) as EventPayload<T>;
}
