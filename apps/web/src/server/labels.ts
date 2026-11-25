export const TENANT_STATUS = {
  ONBOARDING: "Kuruluşta",
  ACTIVE: "Aktif",
  PAUSED: "Durduruldu",
  CLOSED: "Kapandı",
} as const;

export const STEP_LABEL = {
  VEKALETNAME: "Türk noterinde vekâletname",
  APOSTIL: "Apostil ve yeminli tercüme",
  NOTER: "Alman noterinde kuruluş",
  TICARET_SICILI: "Ticaret siciline kayıt",
  VERGI_NO: "Vergi numarası (Steuernummer)",
  UST_ID: "KDV kimlik no (USt-IdNr.)",
  EORI: "EORI gümrük numarası",
  LUCID: "LUCID ambalaj kaydı",
} as const;

export const STEP_STATUS = {
  BEKLIYOR: "Bekliyor",
  SURUYOR: "Sürüyor",
  TAMAM: "Tamam",
  SORUN: "Sorun",
} as const;

export const STAGE_LABEL = {
  FABRIKA: "Fabrikadan çıkış",
  TR_CIKIS: "Türkiye çıkış gümrüğü",
  AB_GIRIS: "AB giriş",
  GUMRUK: "Alman gümrüğü",
  DEPO_KABUL: "Depoya kabul",
} as const;

export const PACKAGE_LABEL = {
  BASLANGIC: "Başlangıç",
  OPERASYON: "Operasyon",
  PAZARA_GIRIS: "Pazara Giriş",
} as const;
