"use client";
/**
 * Çerez onayı (TDDDG + DSGVO + KVKK) ve Google Consent Mode v2.
 * - Varsayılan: tüm ölçüm ve reklam depolaması "denied".
 * - GTM ve Meta Pixel YALNIZ onay sonrası yüklenir; onay yoksa hiçbir üçüncü taraf isteği gitmez.
 * - "Reddet" ve "Kabul et" eşit görünürlükte; ön işaretli kutu yok; karar geri alınabilir.
 */
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const CONSENT_VERSION = "2026-11";
const KEY = "as_consent";

export interface Consent {
  analytics: boolean;
  ads: boolean;
  version: string;
  at: string;
}

type W = Window & {
  dataLayer?: unknown[];
  gtag?: (...a: unknown[]) => void;
  fbq?: (...a: unknown[]) => void;
  __asConsent?: Consent | null;
};

function readStored(): Consent | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? "null") as Consent | null;
    return c && c.version === CONSENT_VERSION ? c : null;
  } catch {
    return null;
  }
}

function gtagConsent(c: Consent) {
  const w = window as W;
  w.dataLayer = w.dataLayer ?? [];
  w.gtag = w.gtag ?? ((...a: unknown[]) => w.dataLayer!.push(a));
  w.gtag("consent", "update", {
    analytics_storage: c.analytics ? "granted" : "denied",
    ad_storage: c.ads ? "granted" : "denied",
    ad_user_data: c.ads ? "granted" : "denied",
    ad_personalization: c.ads ? "granted" : "denied",
  });
}

function loadScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function loadTags(c: Consent, gtmId?: string, pixelId?: string) {
  const w = window as W;
  if (gtmId && (c.analytics || c.ads)) {
    w.dataLayer = w.dataLayer ?? [];
    w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    loadScript("gtm", `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`);
  }
  if (pixelId && c.ads && !w.fbq) {
    const q: unknown[] = [];
    const fbq = (...a: unknown[]) => q.push(a);
    (fbq as unknown as { queue: unknown[] }).queue = q;
    w.fbq = fbq;
    loadScript("fbpixel", "https://connect.facebook.net/en_US/fbevents.js");
    w.fbq("init", pixelId);
    w.fbq("track", "PageView");
  }
}

/** Dönüşüm olayı: onay yoksa HİÇBİR şey gönderilmez. Meta için event_id ile CAPI tekilleştirmesi */
export function track(
  event: string,
  params: Record<string, unknown> = {},
  eventId: string = crypto.randomUUID(),
) {
  if (typeof window === "undefined") return;
  const w = window as W;
  const c = w.__asConsent;
  if (!c) return;
  if (c.analytics || c.ads) {
    w.dataLayer = w.dataLayer ?? [];
    w.dataLayer.push({ event, event_id: eventId, ...params });
  }
  if (c.ads && w.fbq) {
    const metaName = {
      generate_lead: "Lead",
      contact: "Contact",
      schedule: "Schedule",
      sign_up: "CompleteRegistration",
    }[event];
    if (metaName) w.fbq("track", metaName, params, { eventID: eventId });
  }
}

export function adsConsentGiven(): boolean {
  return typeof window !== "undefined" && Boolean((window as W).__asConsent?.ads);
}

const Ctx = createContext<{ consent: Consent | null; open: () => void } | null>(null);
export const useConsent = () => useContext(Ctx);

export function ConsentProvider({
  children,
  gtmId,
  pixelId,
}: {
  children: React.ReactNode;
  gtmId?: string;
  pixelId?: string;
}) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [visible, setVisible] = useState(false);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    const c = readStored();
    (window as W).__asConsent = c;
    /* eslint-disable react-hooks/set-state-in-effect -- yalnız tarayıcıda okunabilen kayıtlı onay */
    setConsent(c);
    setVisible(!c);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (c) {
      gtagConsent(c);
      loadTags(c, gtmId, pixelId);
    }
  }, [gtmId, pixelId]);

  const save = useCallback(
    (analytics: boolean, ads: boolean) => {
      const c: Consent = { analytics, ads, version: CONSENT_VERSION, at: new Date().toISOString() };
      try {
        localStorage.setItem(KEY, JSON.stringify(c));
      } catch {
        /* özel mod: yalnız bu oturum */
      }
      (window as W).__asConsent = c;
      setConsent(c);
      setVisible(false);
      setDetails(false);
      gtagConsent(c);
      loadTags(c, gtmId, pixelId);
      // Onay kaydı (kanıt yükümlülüğü) — kişisel veri içermez
      void fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analytics, ads, version: CONSENT_VERSION }),
        keepalive: true,
      }).catch(() => undefined);
      // Onay geri çekildiyse önceden yüklenmiş etiketler sayfa yenilenince kalkar
      if (
        !analytics &&
        !ads &&
        (document.getElementById("gtm") || document.getElementById("fbpixel"))
      )
        window.location.reload();
    },
    [gtmId, pixelId],
  );

  const value = useMemo(() => ({ consent, open: () => setVisible(true) }), [consent]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {visible && (
        <Banner details={details} setDetails={setDetails} save={save} current={consent} />
      )}
    </Ctx.Provider>
  );
}

function Banner({
  details,
  setDetails,
  save,
  current,
}: {
  details: boolean;
  setDetails: (v: boolean) => void;
  save: (a: boolean, b: boolean) => void;
  current: Consent | null;
}) {
  const [analytics, setAnalytics] = useState(current?.analytics ?? false);
  const [ads, setAds] = useState(current?.ads ?? false);
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="consent-title" className="consent">
      <h2 id="consent-title">Çerez tercihleriniz</h2>
      <p>
        Siteyi çalıştırmak için zorunlu çerezler kullanıyoruz. İzin verirseniz ziyaret
        istatistikleri ve reklam ölçümü için Google ve Meta araçlarını da kullanırız. Kararınızı
        istediğiniz zaman sayfa altındaki &quot;Çerez ayarları&quot;ndan değiştirebilirsiniz.
        Ayrıntılar: <Link href="/cerezler">Çerez politikası</Link>.
      </p>
      {details && (
        <div className="consent-opts">
          <label className="check">
            <input type="checkbox" checked disabled />{" "}
            <span>Zorunlu (oturum, güvenlik, tercihlerin saklanması)</span>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />{" "}
            <span>İstatistik (Google Analytics)</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={ads} onChange={(e) => setAds(e.target.checked)} />{" "}
            <span>Pazarlama (Google Ads, Meta Pixel)</span>
          </label>
        </div>
      )}
      <div className="consent-btns">
        <button type="button" className="btn btn-o" onClick={() => save(false, false)}>
          Reddet
        </button>
        {details ? (
          <button type="button" className="btn btn-o" onClick={() => save(analytics, ads)}>
            Seçimi kaydet
          </button>
        ) : (
          <button type="button" className="btn btn-o" onClick={() => setDetails(true)}>
            Ayarlar
          </button>
        )}
        <button type="button" className="btn btn-o" onClick={() => save(true, true)}>
          Kabul et
        </button>
      </div>
    </div>
  );
}

export function ConsentSettingsLink() {
  const c = useConsent();
  return (
    <button
      type="button"
      onClick={() => c?.open()}
      style={{
        background: "none",
        border: 0,
        color: "inherit",
        cursor: "pointer",
        padding: 0,
        font: "inherit",
        textDecoration: "underline",
      }}
    >
      Çerez ayarları
    </button>
  );
}
