/**
 * Ana sayfa metinleri. Rakam, sertifika, müşteri sayısı veya iş ortaklığı İDDİASI İÇERMEZ;
 * hizmet tanımları ilgili hizmet sayfalarıyla (content/services.ts) tutarlıdır.
 */
import type { Faq } from "./types";

export const trustPoints = [
  {
    n: "01",
    icon: "layers",
    title: "Tek noktadan yönetim",
    text: "Şirket, vergi kaydı, depo, gümrük ve pazaryeri tek ekipte. Tek muhatap, tek panel, tek fatura.",
  },
  {
    n: "02",
    icon: "pin",
    title: "Almanya merkezli operasyon",
    text: "Stok Almanya'daki iş ortağı depoda durur; siparişler Almanya ve AB içine oradan gönderilir, iadeler orada karşılanır.",
  },
  {
    n: "03",
    icon: "scale",
    title: "Şeffaf süreç ve maliyetler",
    text: "Fiyat listemiz yayında. Noter, sicil, gümrük gibi üçüncü taraf masrafları ayrı gösterilir ve faturasıyla yansıtılır.",
  },
  {
    n: "04",
    icon: "support",
    title: "Uçtan uca destek",
    text: "Kuruluştan iadeye kadar Türkçe destek. Hukuki ve vergisel işlemleri lisanslı iş ortaklarımız yürütür.",
  },
] as const;

export type ServiceTile = {
  icon: "building" | "receipt" | "shield" | "warehouse" | "store" | "language" | "return";
  title: string;
  text: string;
  href: string;
  points?: string[];
  flow?: string[];
  size: "lg" | "md" | "sm";
};

export const serviceTiles: ServiceTile[] = [
  {
    icon: "building",
    title: "Almanya şirket kuruluşu",
    text: "UG veya GmbH kuruluşunu Türkiye'den vekâletle yürütün. Belgeler, noter ve ticaret sicili adım adım panelinizde.",
    href: "/almanyada-sirket-kurmak",
    points: ["Vekâletname, apostil ve tercüme rehberliği", "Noter ve ticaret sicili koordinasyonu"],
    flow: ["Vekâletname", "Apostil", "Noter", "Ticaret sicili", "Vergi no"],
    size: "lg",
  },
  {
    icon: "receipt",
    title: "Vergi ve KDV işlemleri",
    text: "Alman vergi numarası, KDV kimlik numarası ve dönemsel beyanlar, vergi danışmanı iş ortağımızla.",
    href: "/uyum-paketi",
    size: "md",
  },
  {
    icon: "warehouse",
    title: "Depolama ve fulfillment",
    text: "Mal kabul, palet bazında depolama, sipariş paketleme ve kargo. Stok anlık olarak panelde.",
    href: "/almanyada-depo-kiralama",
    size: "md",
  },
  {
    icon: "shield",
    title: "Gümrük ve EPR uyumluluğu",
    text: "A.TR ile toplu ithalat, gümrük ve ithalat KDV'si takibi; LUCID, WEEE ve ürün güvenliği kayıtları.",
    href: "/gumruk-atr-ve-3-euro-vergisi",
    size: "sm",
  },
  {
    icon: "store",
    title: "Amazon ve eBay mağaza kurulumu",
    text: "Amazon.de ve eBay.de satıcı hesabı, FBA hazırlığı ve reklam yönetimi.",
    href: "/amazon-almanyada-satis",
    size: "sm",
  },
  {
    icon: "language",
    title: "Almanca ürün listeleme",
    text: "Almanca başlık, açıklama ve ürün özellikleri; pazaryeri kurallarına ve yasal etiket bilgilerine uygun.",
    href: "/amazon-almanyada-satis",
    size: "sm",
  },
  {
    icon: "return",
    title: "İade ve müşteri hizmetleri",
    text: "İadeler Türkiye'ye dönmez: Almanya'da kontrol edilir, yeniden satışa alınır. İsteğe bağlı Almanca müşteri desteği.",
    href: "/iade-merkezi",
    size: "sm",
  },
];

export const steps = [
  {
    n: "01",
    title: "Başvurunuzu yapın",
    text: "Beş kısa adımlık formu doldurun. Ücret ve taahhüt yok.",
  },
  {
    n: "02",
    title: "İşletmenizi analiz edelim",
    text: "Ürününüz için gereken kayıtlar, gümrük, uygun şirket modeli ve aylık maliyet tahmini: uygunluk raporunuz 48 saat içinde e-postanızda.",
  },
  {
    n: "03",
    title: "Almanya operasyonunuzu kuralım",
    text: "Şirket, vergi kayıtları, depo ve pazaryeri hesapları. Her adımın durumunu panelinizden izlersiniz.",
  },
  {
    n: "04",
    title: "Avrupa'da satışa başlayın",
    text: "Mallarınız Almanya deposunda, siparişler pazaryerinden gelir. Stok, sevkiyat ve faturalar tek panelde.",
  },
] as const;

/** Ana sayfa SSS — yanıtlar hukuki/vergisel taahhüt içermez; kesin değerlendirme iş ortaklarınca yapılır */
export const homeFaq: Faq[] = [
  {
    q: "Almanya'da uzaktan şirket kurabilir miyim?",
    a: "Çoğu durumda evet. Türkiye'de noterden vekâletname verip apostil ve yeminli Almanca tercümesini yaptırdığınızda kuruluş, vekiliniz aracılığıyla Almanya'da noter önünde tamamlanır. Hangi belgelerin gerektiği ortaklık yapınıza göre değişir; listeyi panelde adım adım gösteririz.",
  },
  {
    q: "Almanya'da bir adrese ihtiyacım var mı?",
    a: "UG veya GmbH kuruyorsanız ticaret siciline Almanya'da bir iş adresi bildirilmesi gerekir. Operasyon ve Pazara Giriş paketlerinde iş adresi (sanal ofis) dahildir. Türk firmanızla satış yapıyorsanız Almanya'da şirket adresi gerekmez; stok, iş ortağı depoda tutulur.",
  },
  {
    q: "KDV kaydı nasıl işler?",
    a: "Almanya'da stok tutup satış yapan bir firma Alman vergi dairesine kaydolur; vergi numarası ve KDV kimlik numarası (USt-IdNr.) alır, ardından dönemsel KDV beyanı verir. Başvuru ve beyanları iş ortağımız vergi danışmanı (Steuerberater) yürütür. Kayıt süresi vergi dairesine göre değişir; sizin için geçerli yükümlülükleri vergi danışmanının değerlendirmesi belirler.",
  },
  {
    q: "Amazon Almanya'da satış yapabilir miyim?",
    a: "Evet. Amazon.de'de Türk firmanızla ya da Alman şirketinizle satıcı hesabı açılabilir. Almanya'daki stoktan satış için Alman KDV kaydı, ambalaj (LUCID) kaydı ve ürününüze göre CE, ürün güvenliği veya WEEE gibi kayıtlar gerekir; pazaryerleri bunları kontrol eder. Hesap kurulumu, Almanca listeleme ve stok yönetimini biz yürütürüz; hesap onayı Amazon'un kararıdır.",
  },
  {
    q: "Fulfillment nasıl işler?",
    a: "Mallarınızı Almanya'daki iş ortağı depoya palet veya koli olarak toplu gönderirsiniz. Depo mal kabulünü yapar ve stok panelinize işlenir. Pazaryerinden gelen sipariş toplanır, paketlenir ve kargoya verilir; takip numarası pazaryerine ve panelinize yansır. Hedefimiz, saat 14:00'e kadar gelen siparişlerin aynı iş günü kargoya verilmesidir.",
  },
  {
    q: "Ek maliyetler neler?",
    a: "Paket ücreti ve kullanım bazlı depo ücretleri dışında üçüncü taraflara ödenen masraflar vardır: şirket kuruluşunda noter, ticaret sicili, apostil ve tercüme; sevkiyatta nakliye, gümrük vergisi ve ithalat KDV'si; satışta kargo, pazaryeri komisyonları ve reklam bütçesi. Bunlar faturasıyla birebir yansıtılır. Şirket sermayesi masraf değildir, şirketinizde kalır.",
  },
  {
    q: "Kurulum ne kadar sürer?",
    a: "Süre; belgelerin hazırlanmasına, noter randevusuna, ticaret siciline ve vergi dairesine göre değişir ve kesin bir tarih taahhüt edemeyiz. Türk firmanızla satış yapıyorsanız şirket kuruluşu adımı olmadığı için süreç kısalır. Numaraları beklerken ürün kartları, Almanca içerik ve ilk sevkiyat hazırlanabilir; yalnız satış ve ödeme adımları kayıtlar tamamlanınca açılır.",
  },
];
