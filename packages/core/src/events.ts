/**
 * Olay kataloğu. Olaylar outbox tablosuna yazılır, worker tarafından işlenir.
 * Adlandırma: <alan>.<geçmiş zaman fiil>.v<sürüm>  — şema değişirse yeni sürüm açılır.
 */
import { z } from "zod";

export const attribution = z.object({
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(200).optional(),
  gclid: z.string().max(200).optional(),
  fbclid: z.string().max(200).optional(),
  landingPath: z.string().max(300).optional(),
});

export const productCategories = [
  "tekstil",
  "mobilya",
  "gida",
  "kozmetik",
  "ev-mutfak",
  "elektronik",
  "diger",
] as const;

/** Ücretsiz uygunluk raporu / ön değerlendirme formu */
export const leadSubmittedV1 = z.object({
  companyName: z.string().trim().min(2).max(200),
  email: z.email().max(254),
  phone: z.string().trim().min(7).max(30),
  category: z.enum(productCategories),
  consentKvkk: z.literal(true),
  marketingConsent: z.boolean().default(false),
  attribution: attribution.default({}),
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

export const eventSchemas = {
  "lead.submitted.v1": leadSubmittedV1,
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
