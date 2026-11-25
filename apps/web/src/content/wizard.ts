/**
 * "Ürünüm Avrupa'ya uygun mu?" ön kontrol kuralları — saf fonksiyon (test edilebilir).
 * Sonuçlar ön bilgilendirmedir; kesin değerlendirme uygunluk raporunda yapılır.
 * TODO(verify): GPSR, WEEE, BattG, VerpackG ve gıda kuralları resmî kaynaklardan teyit edilecek.
 */
export interface WizardAnswers {
  category:
    "tekstil" | "mobilya" | "gida" | "kozmetik" | "ev-mutfak" | "elektronik" | "oyuncak" | "diger";
  electric: boolean;
  battery: boolean;
  foodContact: boolean;
  buyers: "B2C" | "B2B" | "both";
  stockInGermany: boolean;
}

export type Level = "gerekli" | "muhtemel" | "kontrol";

export interface CheckItem {
  id: string;
  title: string;
  why: string;
  level: Level;
}

export function evaluate(a: WizardAnswers): CheckItem[] {
  const out: CheckItem[] = [];
  const consumer = a.buyers !== "B2B";
  const add = (id: string, title: string, why: string, level: Level) =>
    out.push({ id, title, why, level });

  if (consumer) {
    add(
      "lucid",
      "LUCID ambalaj kaydı",
      "Tüketiciye ulaşan ambalajlı ürün satanlar ambalaj kaydı ve sistem katılımı yapar.",
      "gerekli",
    );
    add(
      "gpsr",
      "Ürün güvenliği: AB sorumlu kişi ve etiket bilgileri",
      "Tüketici ürünlerinde üretici ve AB'deki sorumlu kişinin bilgileri ürün veya ambalajda yer alır.",
      "gerekli",
    );
    add(
      "de-label",
      "Almanca etiket ve kullanım talimatı",
      "Tüketiciye yönelik bilgiler Almanca olmalıdır.",
      "gerekli",
    );
  }
  if (a.stockInGermany) {
    add(
      "vat",
      "Alman KDV kaydı",
      "Almanya'da stok tutup satan satıcılar KDV kaydı yaptırır.",
      "gerekli",
    );
    add("eori", "EORI numarası", "Toplu ithalatta gümrük beyanı için gerekir.", "gerekli");
  }
  if (a.electric || a.category === "elektronik") {
    add(
      "ce",
      "CE uygunluk beyanı ve test raporları",
      "Elektrikli ürünler ilgili AB direktiflerine uygunluk beyanı gerektirir.",
      "gerekli",
    );
    add(
      "weee",
      "Elektrikli ürün (WEEE) kaydı",
      "Elektrikli ve elektronik ürünler Almanya'da satıştan önce kayıt gerektirir.",
      "gerekli",
    );
  }
  if (a.battery)
    add(
      "batt",
      "Pil kaydı",
      "Pil içeren veya pille satılan ürünler için ayrıca kayıt gerekir.",
      "gerekli",
    );
  if (a.category === "oyuncak")
    add(
      "toy",
      "Oyuncak güvenliği (CE, EN 71 testleri)",
      "Oyuncaklar CE işareti ve güvenlik testleri gerektirir.",
      "gerekli",
    );
  if (a.category === "gida") {
    add(
      "food-label",
      "Gıda etiketi (Almanca içerik, alerjen, besin değeri)",
      "Gıdalarda AB etiketleme kuralları uygulanır.",
      "gerekli",
    );
    add(
      "food-reg",
      "Gıda işletmesi kaydı ve ithalat kontrolleri",
      "Ürün grubuna göre kayıt ve sınır kontrolleri gerekebilir.",
      "muhtemel",
    );
  }
  if (a.foodContact)
    add(
      "fcm",
      "Gıdayla temas eden malzeme uygunluk beyanı",
      "Mutfak ürünlerinde malzeme uygunluk beyanı istenir.",
      "gerekli",
    );
  if (a.category === "kozmetik")
    add(
      "cpnp",
      "Kozmetik ürün bildirimi ve güvenlik raporu",
      "Kozmetik ürünler AB pazarına sunulmadan önce bildirilir.",
      "gerekli",
    );
  if (a.category === "tekstil")
    add(
      "textile",
      "Tekstil lif içeriği etiketi",
      "Tekstil ürünlerinde lif bileşimi etikette belirtilir.",
      "gerekli",
    );
  if (a.category === "mobilya")
    add(
      "furniture",
      "Montaj talimatı ve malzeme bilgileri",
      "Kurulum gerektiren ürünlerde Almanca talimat beklenir.",
      "muhtemel",
    );
  if (consumer)
    add(
      "impressum",
      "Web mağazada Impressum, gizlilik ve cayma hakkı",
      "Kendi mağazanızdan satış yapacaksanız zorunlu bilgilerdir.",
      "kontrol",
    );
  add(
    "customs",
    "GTİP kodu ve A.TR ile gümrük kontrolü",
    "Gümrük vergisi ve ithalat KDV'si GTİP koduna göre belirlenir.",
    "kontrol",
  );
  return out;
}
