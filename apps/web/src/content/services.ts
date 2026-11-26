import type { ContentPage } from "./types";

const U = "2026-11-25";

export const services: ContentPage[] = [
  {
    slug: "almanyada-sirket-kurmak",
    title: "Almanya'da Şirket Kurmak: UG ve GmbH, Maliyet ve Süreç",
    description:
      "Türk ihracatçılar için Almanya'da UG veya GmbH kuruluşu: Almanya'ya gitmeden vekâletname ve apostil, maliyet, gerekli evraklar ve süre. Şeffaf fiyat.",
    kicker: "Şirket kuruluşu ve vergi kaydı",
    h1: "Almanya'da şirket kurmak — ihracatçı firmalar için",
    intro:
      "Almanya'da stok tutup satış yapacaksanız yerel bir şirket çoğu zaman işleri kolaylaştırır: Alman KDV kaydı, banka hesabı, pazaryeri hesapları ve faturalama tek çatı altında toplanır. Kuruluşu Türkiye'den yürütürsünüz; biz süreci iş ortağı noter, avukat ve vergi danışmanıyla koordine ederiz.",
    sections: [
      {
        h2: "UG mi, GmbH mı?",
        table: {
          head: ["", "UG (haftungsbeschränkt)", "GmbH"],
          rows: [
            [
              "Asgari sermaye",
              "1 € (pratikte daha fazlası önerilir)",
              "25.000 € (kuruluşta en az 12.500 € yatırılır)",
            ],
            ["Sorumluluk", "Şirket varlığıyla sınırlı", "Şirket varlığıyla sınırlı"],
            ["Yedek akçe", "Yıllık kârın %25'i, sermaye 25.000 €'ya ulaşana kadar ayrılır", "Yok"],
            ["Algı", "Yeni başlayanlar için yaygın", "Tedarikçi ve bankalar nezdinde daha güçlü"],
            ["Hizmet bedelimiz", "€1.250'dan", "€3.000'dan"],
          ],
        },
        paragraphs: [
          "Küçük partilerle Almanya'yı test edecek üreticiler genellikle UG ile başlar ve sermaye büyüdükçe GmbH'ye geçer. Kurumsal alıcılarla çalışacaksanız doğrudan GmbH daha uygun olabilir. Hangisinin size uygun olduğunu uygunluk raporunda öneriyoruz.",
        ],
      },
      {
        h2: "Almanya'ya gitmeden kuruluş: adım adım",
        steps: [
          {
            title: "Türk noterinde vekâletname",
            text: "Şirket ortakları adına işlem yapacak kişiye noterden vekâletname verilir. Metni sizin için hazırlarız.",
          },
          {
            title: "Apostil ve yeminli tercüme",
            text: "Vekâletname ve gerekli belgelere apostil şerhi alınır, yeminli tercümanla Almancaya çevrilir.",
          },
          {
            title: "Alman noterinde kuruluş",
            text: "Şirket sözleşmesi Alman noterinde vekiliniz aracılığıyla imzalanır.",
          },
          {
            title: "Sermaye ve banka hesabı",
            text: "Sermaye şirket hesabına yatırılır; banka seçenekleri için yönlendirme yaparız.",
          },
          {
            title: "Ticaret sicili",
            text: "Noter başvuruyu ticaret siciline iletir; kayıt sonrası şirket resmen kurulmuş olur.",
          },
          {
            title: "Vergi ve gümrük numaraları",
            text: "Vergi numarası, KDV kimlik numarası (USt-IdNr.) ve EORI başvuruları yapılır; ambalaj kaydı (LUCID) planlanır.",
          },
        ],
        note: "Her adımın durumu müşteri panelinizde görünür. Numaralar beklenirken ürün kartlarınızı ve ilk sevkiyatınızı hazırlayabilirsiniz.",
      },
      {
        h2: "Gerekli evraklar",
        bullets: [
          "Ortakların pasaport veya kimlik fotokopisi",
          "Türk şirketi ortak olacaksa: güncel ticaret sicil gazetesi ve imza sirküleri",
          "Noter onaylı vekâletname (apostilli ve yeminli tercümeli)",
          "Şirket adı önerileri ve faaliyet konusu",
          "Almanya'daki iş adresi (sanal ofis hizmetimizle sağlanabilir)",
        ],
      },
      {
        h2: "Toplam maliyet",
        paragraphs: [
          "Hizmet bedelimizin yanında noter, ticaret sicili, apostil ve tercüme gibi üçüncü taraf masrafları vardır; bunlar faturalarıyla birebir yansıtılır. Teklifinizde dahil olan ve olmayan kalemler ayrı ayrı yazılır. Fiyatlar sayfasındaki hesaplayıcıda tahmini toplamı görebilirsiniz.",
        ],
        bullets: [
          "Dahil: süreç koordinasyonu, belge listesi ve vekâletname taslağı, noter ve sicil iletişimi, vergi kaydı başvurusu, panel takibi",
          "Dahil değil: noter ve sicil harçları, apostil ve tercüme bedelleri, şirket sermayesi",
        ],
      },
      {
        h2: "Vergi: çifte vergilendirme ve kâr transferi",
        paragraphs: [
          "Türkiye ile Almanya arasında çifte vergilendirmeyi önleme anlaşması bulunur. Alman şirketinizin kârı Almanya'da vergilendirilir; kâr payının Türkiye'ye aktarılması ve Türk ana şirketteki vergisel durumu ise yapınıza göre değişir. Bu planlamayı iş ortağımız vergi danışmanıyla birlikte yapıyoruz; burada genel bilgi veriyoruz, vergi danışmanlığı yerine geçmez.",
        ],
      },
    ],
    faq: [
      {
        q: "Şirket kuruluşu ne kadar sürer?",
        a: "Belgeler hazır olduğunda noter ve sicil süreci genellikle birkaç hafta sürer; vergi numarası süresi vergi dairesine göre değişir. Panelde her adımı takip edersiniz.",
      },
      {
        q: "Almanya'da oturum izni için şirket kuruyor musunuz?",
        a: "Hayır. Hizmetimiz Almanya'ya ürün satacak ihracatçı firmalar içindir; göç ve oturum danışmanlığı vermiyoruz.",
      },
      {
        q: "Şirket kurmadan satış yapabilir miyim?",
        a: "Evet, Türk firmanızla da satış mümkündür; ancak Almanya'da stok tutacaksanız Alman KDV kaydı gerekir. Uygunluk raporunda iki modeli karşılaştırıyoruz.",
      },
    ],
    cta: {
      title: "Size uygun şirket modelini öğrenin",
      text: "Ücretsiz uygunluk raporunda UG, GmbH veya şirketsiz satış seçeneklerini ürününüze göre karşılaştırıyoruz.",
    },
    schema: "Service",
    verify: [
      "Kuruluş süreleri",
      "Noter ve sicil harç aralıkları",
      "Vekâletname/apostil sürecinin güncel uygulaması",
    ],
    updated: U,
  },
  {
    slug: "almanyada-depo-kiralama",
    title: "Almanya'da Depo Kiralama ve Fulfillment — Şeffaf Fiyat",
    description:
      "Almanya'da depo ve fulfillment: palet başına aylık fiyat, mal kabul, paketleme, Amazon FBA hazırlığı ve iade. Kurulum ücreti yok, aylık fesih.",
    kicker: "Depo ve fulfillment",
    h1: "Almanya'da depo ve fulfillment",
    intro:
      "Malınız Almanya'daki partner depomuzda palet veya raf olarak saklanır; siparişler aynı gün paketlenip kargoya verilir. Stok, sevkiyat ve iadeleri Türkçe panelden takip edersiniz.",
    sections: [
      {
        h2: "Yayınlanmış fiyat listesi",
        table: {
          head: ["Hizmet", "Fiyat"],
          rows: [
            ["Depolama (Euro palet)", "€13 / palet / ay"],
            ["Mal kabul", "€0,50 / koli"],
            ["Pick & pack (aylık hacme göre kademeli)", "€2,10 → €1,60 / sipariş"],
            ["Amazon FBA'ya hazırlık", "€4,90 / koli"],
            ["İade işleme", "€4 / iade"],
            ["Kargo (Almanya içi)", "Taşıyıcı tarifesi, birebir yansıtılır"],
          ],
        },
        note: "Kurulum ücreti yok, aylık fesih. Fiyatlar KDV hariçtir.",
      },
      {
        h2: "Nasıl çalışır?",
        steps: [
          {
            title: "Sevkiyat bildirimi",
            text: "Gönderiyi panelden bildirirsiniz (ürün, koli ve palet sayısı).",
          },
          {
            title: "Mal kabul",
            text: "Depo malı sayar, hasar kontrolü yapar ve stoğa alır; farklar panelde görünür.",
          },
          {
            title: "Sipariş ve paketleme",
            text: "Amazon, eBay veya web mağazanızdan gelen siparişler otomatik olarak depoya iletilir.",
          },
          { title: "Kargo ve takip", text: "Takip numarası pazaryerine ve panelinize işlenir." },
        ],
      },
      {
        h2: "Kimler için uygun?",
        bullets: [
          "Almanya'yı birkaç paletle test etmek isteyen üreticiler (pilot sevkiyat)",
          "Amazon FBA kapasite sınırlarına takılan ve ara depo arayan satıcılar",
          "Hem pazaryeri hem kendi web mağazası için tek stok tutmak isteyen firmalar",
        ],
      },
    ],
    faq: [
      {
        q: "Asgari hacim var mı?",
        a: "Hayır. Tek paletle başlayabilirsiniz; kullanım kadar ödersiniz.",
      },
      {
        q: "Depo nerede?",
        a: "Almanya'daki partner depolarımızla çalışıyoruz; sözleşmede deponun adresi ve sigorta koşulları açıkça yazılır.",
      },
    ],
    cta: {
      title: "Aylık maliyetinizi hesaplayın",
      text: "Palet ve sipariş sayınıza göre tahmini tutarı fiyatlar sayfasında görebilir veya ücretsiz rapor isteyebilirsiniz.",
    },
    schema: "Service",
    verify: [
      "Fiyat listesinin partner depo maliyetiyle teyidi",
      "Depo adresi ve sigorta koşulları",
    ],
    updated: U,
  },
  {
    slug: "gumruk-atr-ve-3-euro-vergisi",
    title: "Almanya'ya İhracat: Gümrük, A.TR, 3 € Vergi ve 2 € İşlem Ücreti",
    description:
      "Türkiye'den Almanya'ya ürün gönderirken gümrük, A.TR, ithalat KDV'si, Temmuz 2026'dan beri kalem başına 3 € vergi ve Kasım 2026'dan beri 2 € işlem ücreti. Paket mi, toplu ithalat mı?",
    kicker: "Gümrük ve lojistik",
    h1: "Gümrük, A.TR ve 2026 paket kuralları: hangi model size uygun?",
    intro:
      "Türkiye ile AB arasındaki gümrük birliği sayesinde sanayi ürünlerinde A.TR dolaşım belgesiyle gümrük vergisi sıfırdır; ithalat KDV'si ise ödenir ve Alman KDV kaydınız varsa indirilebilir. AB, 1 Temmuz 2026'dan itibaren tüketiciye mesafeli satışta 150 €'ya kadar gönderilerde kalem başına 3 € gümrük vergisi, 1 Kasım 2026'dan itibaren de kalem başına 2 € işlem ücreti alıyor. Bu kuralların hangi gönderim yolunda nasıl işlediği, tek tek paket ile toplu ithalat arasındaki farkı belirliyor.",
    sections: [
      {
        h2: "Üç gönderim yolu",
        table: {
          head: [
            "",
            "Tek tek paket, IOSS ile",
            "Tek tek paket, tam beyanname (H1) ile",
            "Toplu ithalat + Almanya deposu",
          ],
          rows: [
            [
              "3 € gümrük vergisi (150 €'ya kadar)",
              "Kalem başına uygulanır",
              "A.TR ile tercihli oran (sanayi ürününde 0) uygulanabilir",
              "Uygulanmaz (mesafeli satış değil, ticari ithalat)",
            ],
            ["2 € işlem ücreti (1.11.2026'dan beri)", "Kalem başına", "Kalem başına", "Uygulanmaz"],
            ["A.TR", "Kullanılamaz", "Kullanılır", "Ticari beyannamede kullanılır"],
            ["Teslim süresi", "Günler–haftalar", "Günler–haftalar", "Almanya içi 1–2 gün"],
            [
              "İade",
              "Türkiye'ye dönüş pahalı",
              "Türkiye'ye dönüş pahalı",
              "Almanya'da işlenir, yeniden satılır",
            ],
            ["Gerekenler", "IOSS kaydı", "Her gönderi için tam beyanname", "Alman KDV kaydı, EORI"],
          ],
        },
        note: "“Kalem”, aynı tarife pozisyonundaki ürünlerin bir beyan satırıdır: iki tişört ve bir telefon kılıfı iki kalemdir. Kurallar AB Komisyonu'nun 3 € vergi uygulama kılavuzuna dayanır; 3 € vergi en az 1 Temmuz 2028'e kadar geçici bir uygulamadır. Ürününüz için gümrük müşaviri iş ortağımızla birlikte teyit ediyoruz.",
      },
      {
        h2: "Gerekli belgeler",
        bullets: [
          "Ticari fatura (GTİP kodlarıyla)",
          "Çeki listesi (koli ve palet bazında)",
          "A.TR dolaşım belgesi (tarım ürünleri ve bazı demir-çelik ürünleri gümrük birliği dışındadır)",
          "Karayolu taşımalarında CMR",
          "Ürüne göre: CE uygunluk beyanı, test raporları, etiket örnekleri",
        ],
      },
      {
        h2: "Panelde sevkiyat takibi",
        paragraphs: [
          "Her sevkiyat beş aşamada izlenir: fabrikadan çıkış, Türkiye çıkış gümrüğü, AB giriş, Alman gümrüğü ve depoya kabul. Eksik belge olduğunda panel sizi uyarır.",
        ],
      },
    ],
    faq: [
      {
        q: "Gümrük vergisi ödeyecek miyim?",
        a: "A.TR ile gönderilen sanayi ürünlerinde ticari ithalatta gümrük vergisi sıfırdır; ithalat KDV'si ödenir. Tüketiciye tek tek paket gönderiyorsanız durum değişir: IOSS kullanırsanız kalem başına 3 € vergi ve 2 € işlem ücreti ödenir, A.TR dikkate alınmaz. Kesin durumu ürününüzün GTİP koduna göre raporda belirtiyoruz.",
      },
      {
        q: "IOSS kullanmazsam 3 €'dan kurtulur muyum?",
        a: "Tam beyanname (H1) ile A.TR'ye dayalı tercihli oran 3 €'nun yerine geçebilir, ancak 2 € işlem ücreti yine alınır ve her paket için ayrı beyanname maliyeti doğar. Düzenli satış için toplu ithalat ve Almanya deposu genellikle daha öngörülebilirdir.",
      },
    ],
    cta: {
      title: "Ürününüz için gümrük ve KDV tahmini",
      text: "Uygunluk raporunda GTİP kodunuza göre tahmini gümrük ve ithalat KDV'sini hesaplıyoruz.",
    },
    schema: "Service",
    verify: [
      "Tam beyanname (H1) ile A.TR tercihinin mesafeli satışta uygulaması (gümrük müşaviri)",
    ],
    updated: U,
  },
  {
    slug: "amazon-almanyada-satis",
    title: "Amazon Almanya'da Satış: Hesap, Listeleme, FBA ve Reklam",
    description:
      "Amazon.de ve eBay.de'de satış: hesap açılışı, Almanca listeleme, FBA hazırlığı, reklam yönetimi ve hesap kapanma risklerine karşı uyum kontrolü.",
    kicker: "Amazon.de ve eBay.de",
    h1: "Amazon Almanya ve eBay.de'de satış",
    intro:
      "Almanya, Amazon'un Avrupa'daki en büyük pazarlarından biri. Hesabın doğru açılması, ürün sayfalarının Almanca ve mevzuata uygun hazırlanması ve stoğun doğru yönetilmesi satışın temelidir. Lojistiği ve pazarlamayı aynı ekipten alırsınız.",
    sections: [
      {
        h2: "Neler yapıyoruz?",
        bullets: [
          "Satıcı hesabı açılışı ve doğrulama hazırlığı",
          "Almanca ürün başlıkları, açıklamalar ve görseller (anadil kontrolüyle)",
          "Kategori, varyasyon ve fiyat yapısı",
          "FBA'ya hazırlık ve FBA dışı gönderim (kendi depomuzdan)",
          "Sponsorlu ürün reklamları (PPC) ve aylık performans raporu",
          "Uyum kontrolü: GPSR bilgileri, ambalaj kaydı, elektrikli ürünlerde WEEE kaydı",
        ],
      },
      {
        h2: "Hesap kapanmasına yol açan sık hatalar",
        bullets: [
          "Ambalaj kaydı (LUCID) numarasının eksik olması",
          "Ürün güvenliği için AB'deki sorumlu kişinin belirtilmemesi",
          "Almanca olmayan veya yanlış etiket ve kullanım kılavuzu",
          "Stok ve teslim süresi tutarsızlıkları",
        ],
      },
    ],
    cta: {
      title: "Ürününüz Amazon.de'ye hazır mı?",
      text: "Uygunluk raporunda kategori gereksinimlerini ve eksik belgeleri listeliyoruz.",
    },
    schema: "Service",
    verify: ["Kategori bazlı Amazon gereksinimleri"],
    updated: U,
  },
  {
    slug: "uyum-paketi",
    title: "Uyum Paketi: KDV Kaydı, Mali Temsilci, LUCID, GPSR, WEEE",
    description:
      "Almanya'da satış için gereken kayıtlar tek pakette: Alman KDV kaydı, mali temsilci, LUCID ambalaj kaydı (PPWR/VerpackDG), ürün güvenliği sorumlu kişisi ve WEEE kaydı.",
    kicker: "Uyum paketi",
    h1: "Almanya'da satış için gereken kayıtlar, tek pakette",
    intro:
      "Almanya'da stok tutan bir satıcı olarak birden fazla kayıt ve yükümlülüğünüz olur. Bunlar genellikle farklı uzmanlarda dağınık kalır; biz iş ortaklarımızla birlikte tek pakette koordine ediyoruz.",
    sections: [
      {
        h2: "Pakette neler var?",
        bullets: [
          "Alman KDV kaydı ve dönemsel beyanların vergi danışmanı iş ortağıyla takibi",
          "Gerekiyorsa mali temsilci (Fiskalvertretung) koordinasyonu",
          "LUCID ambalaj kaydı ve ambalaj sistemi katılımı (12 Ağustos 2026'dan beri AB Ambalaj Yönetmeliği PPWR ve Alman VerpackDG)",
          "Ürün güvenliği (GPSR): AB dışındaki üretici için AB'de yerleşik sorumlu kişi; adı ve iletişim bilgisi ürün veya ambalajda ve satış sayfasında",
          "Elektrikli ve elektronik ürünlerde stiftung ear kaydı (WEEE numarası)",
          "Web mağaza için Impressum, gizlilik ve cayma hakkı metinleri",
        ],
      },
      {
        h2: "Almanya'da şirketiniz yoksa: yetkili temsilci",
        paragraphs: [
          "Almanya'da şubesi veya şirketi olmayan bir üretici, ambalaj (LUCID) ve elektrikli ürün (stiftung ear) yükümlülükleri için Almanya'da yerleşik bir yetkili temsilci (Bevollmächtigter) atamak zorundadır; ambalajda bu zorunluluk 12 Ağustos 2026'da başladı. Almanya'da kendi şirketinizle ithalat yapıyorsanız bu yükümlülükleri şirketiniz üstlenir.",
        ],
      },
      {
        h2: "Neden önemli?",
        paragraphs: [
          "Pazaryerleri ve fulfillment sağlayıcıları, satıcının WEEE ve ambalaj kayıtlarını kontrol etmekle yükümlüdür; kaydı eksik ürünler satıştan kaldırılır. Eksik kayıtlar hesap askıya alınmasına veya ihtarnamelere de yol açabilir. Kayıt durumunuz panelde görünür; yenileme ve beyan tarihleri için hatırlatma alırsınız.",
        ],
      },
    ],
    cta: {
      title: "Hangi kayıtlar sizin için gerekli?",
      text: "Ürününüze ve satış modelinize göre gereken kayıtları uygunluk raporunda listeliyoruz.",
    },
    schema: "Service",
    verify: ["Mali temsilci gerekliliğinin koşulları (vergi danışmanı)"],
    updated: U,
  },
  {
    slug: "iade-merkezi",
    title: "Almanya'da İade Merkezi — İadeyi Zarar Yazmayın",
    description:
      "Avrupa'da e-ticaret iadeleri yüksek. İadeler Almanya'da kontrol edilir, yeniden etiketlenir ve tekrar satışa alınır; durumu Türkçe panelden izlersiniz.",
    kicker: "İade yönetimi",
    h1: "İadeleri Almanya'da yönetin, zarar yazmayın",
    intro:
      "Avrupa'ya giden e-ticaret paketlerinde iade oranı yüksektir. İadenin Türkiye'ye dönmesi çoğu zaman ürünün değerinden pahalıdır. Yerel iade merkezi, satılabilir ürünleri hızla yeniden stoğa alır.",
    sections: [
      {
        h2: "İade süreci",
        steps: [
          {
            title: "Kabul ve kontrol",
            text: "İade depoya geldiğinde ambalaj ve ürün kontrol edilir, fotoğraflanır.",
          },
          {
            title: "Sınıflandırma",
            text: "Satılabilir, yeniden paketlenecek veya kusurlu olarak ayrılır.",
          },
          { title: "Yeniden satış", text: "Satılabilir ürünler yeniden etiketlenip stoğa alınır." },
          {
            title: "Raporlama",
            text: "İade nedenleri ürün bazında raporlanır; ürün sayfası ve ambalaj iyileştirmeleri önerilir.",
          },
        ],
      },
    ],
    cta: {
      title: "İade maliyetinizi düşürün",
      text: "Ürün kategorinize göre beklenen iade oranını ve maliyet etkisini raporda paylaşıyoruz.",
    },
    schema: "Service",
    updated: U,
  },
  {
    slug: "e-ihracat-destek-rehberi",
    title: "E-İhracat Destekleri 2026: Neler Değişti? Dürüst Rehber",
    description:
      "2026'da e-ihracat destek kuralları değişti: yurt dışı depo kira desteği kaldırıldı, sipariş karşılama (fulfillment) desteği listedeki sağlayıcılarla sürüyor. Oranlar, şartlar ve ön kontrol.",
    kicker: "Destek rehberi",
    h1: "E-ihracat destekleri 2026: neler değişti?",
    intro:
      "E-ihracat destekleri 5986 sayılı Cumhurbaşkanı Kararı ve Ticaret Bakanlığı'nın E-İhracat Desteklerine İlişkin Genelgesi ile düzenlenir; Karar 17 Ocak 2026'da (10881 sayılı Karar) değişti, Genelge 13 Nisan 2026'da yenilendi. İnternette hâlâ kaldırılmış destekleri anlatan içerikler var. Bu sayfada güncel metinlere göre bildiklerimizi ve teyit edilmesi gerekenleri açıkça yazıyoruz.",
    sections: [
      {
        h2: "Kısaca",
        bullets: [
          "Yurt dışı depo kira desteği Genelge'de kaldırıldı (Madde 16 mülga). Daha önce onay almış olanlar süreleri bitene kadar desteklenmeye devam ediyor.",
          "Sipariş karşılama (fulfillment) desteği sürüyor: yurt dışındaki birim başına sipariş karşılama (iade kabulü dâhil) ve depolama giderlerinin %50'si, ülke başına en fazla 3 yıl (Madde 15).",
          "Desteklenen gider, o ülkedeki toplam e-ticaret satışınızın %10'unu aşamaz.",
          "Hizmet, Bakanlığın sipariş karşılama hizmeti sunan firma listesindeki bir sağlayıcıdan veya doğrudan pazaryerinden alınmalı; harcamadan önce ön onay gerekir.",
          "Hedef ülkelerde oran 20 puan artar (%70'e kadar). Bakanlık yetkilileri Almanya'nın e-ihracat hedef ülkeleri arasına alındığını açıkladı.",
        ],
      },
      {
        h2: "Genel şartlar",
        bullets: [
          "İhracatçı birliği üyeliği ve Destek Yönetim Sistemi (DYS) kaydı",
          "Türk ürünü: üretimin tamamı veya bir kısmı Türkiye'de",
          "Üründe ve satış platformunda barkod numarası (KTÜN/GTIN) ve Türkiye'deki üretim yeri bilgisi",
          "Yurt içinde tescilli marka ve en az bir yurt dışı tescil başvurusu",
          "Satışların e-ticaret olarak beyan edilmesi (gümrük beyannamesinde e-ihracat beyanı)",
        ],
      },
      {
        h2: "Desteklenmeyenler",
        bullets: [
          "Komisyon, üyelik ve dolaylı vergi dışındaki vergiler",
          "Ürünün ülkeden geri çekilmesi veya imhası",
          "Ön onaydan önce yapılan harcamalar",
        ],
      },
      {
        h2: "Biz ne yapıyoruz, ne yapmıyoruz?",
        paragraphs: [
          "Uygun firmalara destek başvurularında belge ve süreç rehberliği yapıyoruz; panelimiz Genelge'nin sağlayıcılardan beklediği barkod (KTÜN) bazlı aylık raporu üretebiliyor. Destek alacağınızı garanti etmiyoruz; depo kiranızın devlet tarafından karşılanacağı gibi vaatlerde bulunmuyoruz. Yanıltıcı beyan, desteklerin geri alınmasına ve yasaklara yol açabilir.",
        ],
        note: "Bakanlığın sipariş karşılama hizmeti sunan firma listesinde henüz yer almıyoruz. Listeye girdiğimizde bunu bu sayfada açıkça duyuracağız.",
      },
    ],
    faq: [
      {
        q: "Yurt dışı depo kira desteği alabilir miyim?",
        a: "Yeni başvurular için hayır: bu destek 13 Nisan 2026 tarihli Genelge'de kaldırıldı. Mevcut onayınız varsa süresi bitene kadar devam eder. Bunun yerine sipariş karşılama desteğinin şartlarını ön kontrolde birlikte değerlendiriyoruz.",
      },
      {
        q: "Sipariş karşılama desteği ne kadar?",
        a: "Uygun giderlerin %50'si, hedef ülkelerde 20 puan fazlası. Desteklenen gider, o ülkedeki e-ticaret satışlarınızın %10'unu aşamaz ve yıllık bir üst limiti vardır (her yıl güncellenir). Destek, ön onayı izleyen aydan başlar.",
      },
    ],
    cta: {
      title: "Destek uygunluk ön kontrolü",
      text: "Firmanızın hangi desteklere başvurabileceğini ücretsiz uygunluk raporunda kısa bir ön kontrolle değerlendiriyoruz.",
    },
    schema: "Article",
    verify: [
      "Almanya'nın Genelge ekindeki hedef ülkeler listesinde yer alması (resmî ek)",
      "2026 yıllık destek üst limitleri (Genelge ekleri)",
    ],
    updated: U,
  },
];

export const serviceBySlug = new Map(services.map((s) => [s.slug, s]));
