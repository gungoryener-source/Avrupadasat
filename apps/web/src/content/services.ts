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
    title: "Almanya'ya İhracat: Gümrük, A.TR ve 2026 Paket Vergisi",
    description:
      "Türkiye'den Almanya'ya ürün gönderirken gümrük, A.TR, ithalat KDV'si ve 2026'da düşük değerli paketlere gelen ek vergi. Paket mi, toplu ithalat mı?",
    kicker: "Gümrük ve lojistik",
    h1: "Gümrük, A.TR ve 2026 paket vergisi: hangi model size uygun?",
    intro:
      "Türkiye ile AB arasındaki gümrük birliği sayesinde sanayi ürünlerinde A.TR dolaşım belgesiyle gümrük vergisi genellikle sıfırdır; ithalat KDV'si ise ödenir ve KDV kaydınız varsa geri alınabilir. 2026'daki değişiklikler, tek tek paket göndermek ile toplu ithalat arasındaki farkı büyüttü.",
    sections: [
      {
        h2: "Paket mi, toplu ithalat mı?",
        table: {
          head: ["", "Tek tek paket (e-ticaret)", "Toplu ithalat + Almanya deposu"],
          rows: [
            [
              "2026 ek vergisi",
              "1 Temmuz 2026'dan itibaren düşük değerli paketlere ek vergi",
              "Uygulanmaz (ticari yük)",
            ],
            [
              "A.TR",
              "E-ticaret beyannamesinde kullanımı henüz netleşmedi",
              "Ticari beyannamede kullanılır",
            ],
            ["Teslim süresi", "Günler–haftalar", "Almanya içi 1–2 gün"],
            ["İade", "Türkiye'ye dönüş pahalı", "Almanya'da işlenir, yeniden satılır"],
            ["Gerekenler", "Daha az kayıt", "Alman KDV kaydı, EORI"],
          ],
        },
        note: "Kurallar değişiyor; teklifinizde güncel durumu gümrük müşaviri iş ortağımızla birlikte teyit ediyoruz.",
      },
      {
        h2: "Gerekli belgeler",
        bullets: [
          "Ticari fatura (GTİP kodlarıyla)",
          "Çeki listesi (koli ve palet bazında)",
          "A.TR dolaşım belgesi",
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
        q: "Gümrüksüz satış yapabilir miyim?",
        a: "Gümrük vergisi ürüne ve beyan türüne göre değişir; A.TR ile sanayi ürünlerinde çoğunlukla sıfırdır ancak ithalat KDV'si ödenir. Kesin durumu ürününüzün GTİP koduna göre raporda belirtiyoruz.",
      },
    ],
    cta: {
      title: "Ürününüz için gümrük ve KDV tahmini",
      text: "Uygunluk raporunda GTİP kodunuza göre tahmini gümrük ve ithalat KDV'sini hesaplıyoruz.",
    },
    schema: "Service",
    verify: [
      "2026 ek vergisinin tutarı ve kapsamı (resmî kaynak)",
      "H7 beyannamesinde A.TR durumu",
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
    title: "Uyum Paketi: KDV Kaydı, Mali Temsilci, LUCID, GPSR",
    description:
      "Almanya'da satış için gereken kayıtlar tek pakette: Alman KDV kaydı, mali temsilci koordinasyonu, LUCID ambalaj kaydı ve ürün güvenliği sorumlu kişisi.",
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
          "LUCID ambalaj kaydı ve ambalaj sistemi katılımı",
          "Ürün güvenliği için AB sorumlu kişi bilgileri",
          "Elektrikli ve elektronik ürünlerde WEEE kaydı yönlendirmesi",
          "Web mağaza için Impressum, gizlilik ve cayma hakkı metinleri",
        ],
      },
      {
        h2: "Neden önemli?",
        paragraphs: [
          "Eksik kayıtlar pazaryerlerinde ürünlerin kaldırılmasına, hesap askıya alınmasına veya ihtarnamelere yol açabilir. Kayıt durumunuz panelde görünür; yenileme ve beyan tarihleri için hatırlatma alırsınız.",
        ],
      },
    ],
    cta: {
      title: "Hangi kayıtlar sizin için gerekli?",
      text: "Ürününüze ve satış modelinize göre gereken kayıtları uygunluk raporunda listeliyoruz.",
    },
    schema: "Service",
    verify: [
      "GPSR, WEEE ve VerpackG yükümlülüklerinin resmî kaynaklardan teyidi",
      "Mali temsilci gerekliliğinin koşulları",
    ],
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
      "2026'da e-ihracat destek kuralları değişti. Yurt dışı depo kira desteği, sipariş karşılama desteği ve şartlar hakkında dürüst bir özet ve ön kontrol.",
    kicker: "Destek rehberi",
    h1: "E-ihracat destekleri 2026: neler değişti?",
    intro:
      "Ticaret Bakanlığı'nın e-ihracat destek düzenlemeleri 2026'da güncellendi. İnternette hâlâ eski oranları ve kaldırılmış destekleri anlatan içerikler var. Bu sayfada bildiklerimizi ve henüz netleşmeyenleri açıkça yazıyoruz.",
    sections: [
      {
        h2: "Kısaca",
        bullets: [
          "Yurt dışı depo kira desteği yeni başvurular için kaldırılmış görünüyor; mevcut onaylar süreleri bitene kadar devam ediyor.",
          "Ağırlık, Bakanlık onaylı sağlayıcılar üzerinden sipariş karşılama (fulfillment) giderlerine verilen desteğe kaydı.",
          "Pazaryeri tanıtımı, e-ihracat tanıtımı ve pazaryeri komisyonu destekleri farklı şartlarla sürüyor.",
          "Destekler harcamadan önce ön onaya ve firmanın uygunluğuna bağlı.",
        ],
      },
      {
        h2: "Genel şartlar",
        bullets: [
          "İlgili ihracatçı birliği üyeliği ve sistem kayıtları",
          "Türk menşeli ürün",
          "Bazı desteklerde markanın uluslararası tescil başvurusu",
          "Giderlerin belirlenen oranlar ve üst sınırlar içinde kalması",
        ],
      },
      {
        h2: "Biz ne yapıyoruz, ne yapmıyoruz?",
        paragraphs: [
          "Uygun firmalara destek başvurularında belge ve süreç rehberliği yapıyoruz. Destek alacağınızı garanti etmiyoruz ve “devlet depo kiranızı öder” gibi vaatlerde bulunmuyoruz. Yanıltıcı beyan, desteklerin geri alınmasına ve yasaklara yol açabilir.",
        ],
        note: "Bakanlık onaylı sağlayıcı listesinde yer aldığımızda bunu bu sayfada açıkça duyuracağız.",
      },
    ],
    faq: [
      {
        q: "Yurt dışı depo kira desteği alabilir miyim?",
        a: "Güncel düzenlemeye göre bu destek yeni başvurular için kaldırılmış görünüyor. Mevcut onayınız varsa süresi bitene kadar devam eder. Firmanıza özel durumu ön kontrolde birlikte değerlendiriyoruz.",
      },
    ],
    cta: {
      title: "Destek uygunluk ön kontrolü",
      text: "Firmanızın hangi desteklere başvurabileceğini ücretsiz uygunluk raporunda kısa bir ön kontrolle değerlendiriyoruz.",
    },
    schema: "Article",
    verify: [
      "13.04.2026 E-İhracat Genelgesi ve 10881 sayılı Karar sonrası konsolide metin",
      "Destek oranları, üst sınırlar ve Almanya'nın hedef ülke statüsü",
    ],
    updated: U,
  },
];

export const serviceBySlug = new Map(services.map((s) => [s.slug, s]));
