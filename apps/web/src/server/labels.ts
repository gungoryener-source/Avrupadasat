export { STAGE_LABEL, STEP_LABEL, STEP_STATUS } from "@avrupadasat/core/labels";

export const TENANT_STATUS = {
  ONBOARDING: "Kuruluşta",
  ACTIVE: "Aktif",
  PAUSED: "Durduruldu",
  CLOSED: "Kapandı",
} as const;

export const PACKAGE_LABEL = {
  BASLANGIC: "Başlangıç",
  OPERASYON: "Operasyon",
  PAZARA_GIRIS: "Pazara Giriş",
} as const;
