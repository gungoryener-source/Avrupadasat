/**
 * AB sorumlu taraf (Kapı 0 K0-1) — doğrulama kuralları.
 * Dayanaklar: GPSR (AB) 2023/988 Md. 16 ve 19; Piyasa Gözetimi Yön. (AB) 2019/1020 Md. 4;
 * PPWR + VerpackDG (12.08.2026'dan beri ambalajda yetkili temsilci); ElektroG § 8 (WEEE yetkili temsilci).
 * Hukuki değerlendirme değildir; model seçimi avukatla birlikte yapılır.
 */
import { z } from "zod";

export const IMPORTER_MODELS = ["OWN_DE_COMPANY", "TR_WITH_REPRESENTATIVE"] as const;

export const IMPORTER_MODEL_LABEL: Record<(typeof IMPORTER_MODELS)[number], string> = {
  OWN_DE_COMPANY: "Almanya'daki şirketimiz ithalatçı",
  TR_WITH_REPRESENTATIVE: "Türk şirketimiz ithalatçı; AB'de yetkili temsilci var",
};

/** stiftung ear kayıt numarası: "DE" + 8 hane (boşluklu yazım kabul edilir) */
export const WEEE_RE = /^DE ?\d{8}$/;
/** LUCID kayıt numarası: "DE" + 13 hane. TODO(verify): Zentrale Stelle'nin güncel biçimiyle teyit */
export const LUCID_RE = /^DE\d{13}$/;

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const euPartyInput = z
  .object({
    importerModel: z.enum(IMPORTER_MODELS, { message: "İthalatçı modelini seçin" }),
    responsibleName: z.string().trim().min(2, "Sorumlu kişi veya şirket adı gerekli").max(200),
    responsibleAddress: z.string().trim().min(10, "AB'deki posta adresi gerekli").max(400),
    responsibleEmail: z.string().trim().email("Geçerli bir e-posta adresi girin").max(200),
    lucidNumber: optText(20).refine((v) => !v || LUCID_RE.test(v.replace(/\s/g, "")), {
      message: "LUCID numarası DE ile başlayan 15 karakter olmalı",
    }),
    packagingRepresentative: optText(200),
    sellsElectrical: z.boolean().default(false),
    weeeNumber: optText(20).refine((v) => !v || WEEE_RE.test(v), {
      message: "WEEE numarası DE ve 8 haneden oluşmalı",
    }),
    weeeRepresentative: optText(200),
  })
  .superRefine((v, ctx) => {
    if (v.importerModel === "TR_WITH_REPRESENTATIVE") {
      if (!v.packagingRepresentative)
        ctx.addIssue({
          code: "custom",
          path: ["packagingRepresentative"],
          message: "Almanya'da şirketiniz yoksa ambalaj için yetkili temsilci zorunludur",
        });
      if (v.sellsElectrical && !v.weeeRepresentative)
        ctx.addIssue({
          code: "custom",
          path: ["weeeRepresentative"],
          message:
            "Elektrikli ürünlerde Almanya'da şirketiniz yoksa WEEE yetkili temsilcisi zorunludur",
        });
    }
  })
  .transform((v) => ({ ...v, lucidNumber: v.lucidNumber?.replace(/\s/g, "") ?? null }));

export type EuPartyInput = z.input<typeof euPartyInput>;
export type EuParty = z.output<typeof euPartyInput>;

/** Satış öncesi hâlâ eksik olan numaralar (mal kabulü engellemez; bilgilendirme) */
export function pendingRegistrations(
  p: Pick<EuParty, "lucidNumber" | "sellsElectrical" | "weeeNumber">,
) {
  const out: string[] = [];
  if (!p.lucidNumber) out.push("LUCID ambalaj kaydı numarası");
  if (p.sellsElectrical && !p.weeeNumber) out.push("WEEE (stiftung ear) kayıt numarası");
  return out;
}
