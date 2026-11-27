/** Kullanıcıya görünen Türkçe etiketler — web, worker (e-posta) ve mobil aynı kaynağı kullanır */
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

/** Uygunluk formu yanıt etiketleri (site ve ekip paneli) */
export const LEAD_CHANNEL_LABEL = {
  amazon: "Amazon.de",
  ebay: "eBay.de",
  webshop: "Kendi web mağazası",
  b2b: "Toptan / B2B satış",
  unsure: "Henüz karar vermedim",
} as const;

export const LEAD_EXPORT_STATUS_LABEL = {
  none: "Henüz ihracat yapmıyoruz",
  non_eu: "AB dışına ihracat yapıyoruz",
  eu_parcel: "AB'ye paketle (tek tek) satıyoruz",
  eu_bulk: "AB'ye toptan veya toplu sevkiyat yapıyoruz",
} as const;
