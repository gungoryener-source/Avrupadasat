"use client";

import { useEffect, useRef, useState } from "react";
import type { ScanHit, ScanResult } from "@/server/scan";

type Entry = { key: number; query: string; result?: ScanResult; error?: string };

type Stopper = () => void;

/** Kısa sesli geri bildirim: bulundu (tiz, kısa) / bulunamadı (pes, uzun) */
function beep(ok: boolean) {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = ok ? 1046 : 220;
    g.gain.value = 0.06;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (ok ? 0.08 : 0.25));
    o.onended = () => void ctx.close();
  } catch {
    /* ses kapalıysa sessiz geç */
  }
}

const BY: Record<string, string> = { code: "Etiket kodu", ean: "EAN", sku: "SKU" };

/**
 * Barkod okutma alanı. El okuyucular klavye gibi yazıp Enter gönderir; alan sürekli odakta kalır.
 * Kamera: tarayıcıda BarcodeDetector varsa o, yoksa ZXing (yalnız açıldığında yüklenir).
 */
export function Scanner({ showTenant }: { showTenant: boolean }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Entry[]>([]);
  const [cam, setCam] = useState<"off" | "starting" | "on" | "error">("off");
  const [camMsg, setCamMsg] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stopper = useRef<Stopper | null>(null);
  const last = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const seq = useRef(0);

  useEffect(() => () => stopper.current?.(), []);

  async function lookup(raw: string) {
    const q = raw.trim();
    if (!q) return;
    setBusy(true);
    const key = ++seq.current;
    try {
      const r = await fetch(`/api/okut?kod=${encodeURIComponent(q)}`, { cache: "no-store" });
      const body = (await r.json()) as ScanResult & { error?: string };
      if (!r.ok) {
        beep(false);
        setLog((l) => [{ key, query: q, error: body.error ?? "Hata" }, ...l].slice(0, 25));
      } else {
        beep(body.hits.length > 0);
        setLog((l) => [{ key, query: q, result: body }, ...l].slice(0, 25));
      }
    } catch {
      beep(false);
      setLog((l) => [{ key, query: q, error: "Bağlantı hatası" }, ...l].slice(0, 25));
    } finally {
      setBusy(false);
      setValue("");
      input.current?.focus();
    }
  }

  function onDetected(code: string) {
    const now = Date.now();
    // Kamera aynı kodu art arda görür: 2,5 sn içinde tekrarını yok say
    if (code === last.current.code && now - last.current.at < 2500) return;
    last.current = { code, at: now };
    void lookup(code);
  }

  function stopCamera() {
    stopper.current?.();
    stopper.current = null;
    setCam("off");
    input.current?.focus();
  }

  async function startCamera() {
    setCam("starting");
    setCamMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      const v = video.current!;
      v.srcObject = stream;
      await v.play();
      const stopTracks = () => stream.getTracks().forEach((t) => t.stop());
      type Detector = { detect(src: HTMLVideoElement): Promise<{ rawValue: string }[]> };
      const BD = (
        window as unknown as {
          BarcodeDetector?: {
            new (o: { formats: string[] }): Detector;
            getSupportedFormats(): Promise<string[]>;
          };
        }
      ).BarcodeDetector;
      const formats = BD ? await BD.getSupportedFormats().catch(() => []) : [];
      if (BD && formats.includes("code_128")) {
        const det = new BD({
          formats: ["code_128", "ean_13", "ean_8", "upc_a"].filter((f) => formats.includes(f)),
        });
        let alive = true;
        const tick = async () => {
          if (!alive) return;
          try {
            const found = await det.detect(v);
            if (found[0]?.rawValue) onDetected(found[0].rawValue);
          } catch {
            /* kare atlanır */
          }
          if (alive) setTimeout(tick, 200);
        };
        void tick();
        stopper.current = () => {
          alive = false;
          stopTracks();
        };
      } else {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromStream(stream, v, (res) => {
          if (res) onDetected(res.getText());
        });
        stopper.current = () => {
          controls.stop();
          stopTracks();
        };
      }
      setCam("on");
    } catch (e) {
      stopper.current?.();
      stopper.current = null;
      setCam("error");
      setCamMsg(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Kamera izni verilmedi. Tarayıcı ayarlarından bu siteye kamera izni verin."
          : "Kamera açılamadı. El okuyucu veya elle giriş kullanabilirsiniz.",
      );
    }
  }

  const [current, ...older] = log;

  return (
    <div className="scan">
      <section className="pc scan-box">
        <form
          className="scan-form"
          onSubmit={(e) => {
            e.preventDefault();
            void lookup(value);
          }}
        >
          <label htmlFor="scan-input" className="scan-label">
            Barkodu okutun veya kodu yazın
          </label>
          <div className="scan-row">
            <input
              id="scan-input"
              ref={input}
              className="scan-input mono"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="search"
              placeholder="Etiket kodu, EAN veya SKU"
              maxLength={64}
            />
            <button className="btn btn-p" type="submit" disabled={busy || !value.trim()}>
              Bul
            </button>
            {cam === "on" || cam === "starting" ? (
              <button className="btn btn-o" type="button" onClick={stopCamera}>
                Kamerayı kapat
              </button>
            ) : (
              <button className="btn btn-o" type="button" onClick={() => void startCamera()}>
                Kamerayla okut
              </button>
            )}
          </div>
          <p className="muted scan-hint">
            USB veya Bluetooth okuyucu kullanıyorsanız bu alan seçiliyken okutmanız yeterli.
          </p>
        </form>
        <div className="scan-cam" hidden={cam !== "on" && cam !== "starting"}>
          <video ref={video} muted playsInline aria-label="Kamera görüntüsü" />
          <span className="scan-aim" aria-hidden="true" />
        </div>
        {cam === "error" && (
          <p className="alert-err" role="alert">
            {camMsg}
          </p>
        )}
      </section>

      <div aria-live="polite">
        {current && <Result entry={current} showTenant={showTenant} big />}
      </div>

      {older.length > 0 && (
        <section className="pc">
          <header className="pc-h">
            <h2>Bu oturumda okutulanlar</h2>
          </header>
          <ul className="ls">
            {older.map((e) => (
              <li key={e.key}>
                <div className="ls-main">
                  <span className="mono">{e.query}</span>
                  <small>
                    {e.error
                      ? e.error
                      : e.result!.hits.length === 0
                        ? "Bulunamadı"
                        : e.result!.hits.map((h) => `${h.sku} · ${h.name}`).join(", ")}
                  </small>
                </div>
                {e.result?.hits[0] && (
                  <span className="mono">{e.result.hits[0].location ?? "raf yok"}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Result({ entry, showTenant }: { entry: Entry; showTenant: boolean; big?: boolean }) {
  if (entry.error)
    return (
      <p className="alert-err" role="alert">
        {entry.query}: {entry.error}
      </p>
    );
  const r = entry.result!;
  if (r.hits.length === 0)
    return (
      <p className="alert-err" role="alert">
        <b className="mono">{r.query}</b> için ürün bulunamadı. Etiket başka bir firmaya ait
        olabilir veya ürün kartı henüz açılmamış olabilir.
      </p>
    );
  return (
    <div className="scan-hits">
      {r.hits.length > 1 && (
        <p className="alert-ok">
          {r.hits.length} ürün eşleşti ({BY[r.by ?? ""] ?? r.by}). Doğru ürünü seçin.
        </p>
      )}
      {r.hits.map((h) => (
        <Hit key={h.id} h={h} by={r.by} showTenant={showTenant} />
      ))}
    </div>
  );
}

function Hit({ h, by, showTenant }: { h: ScanHit; by: ScanResult["by"]; showTenant: boolean }) {
  const avail = h.quantity - h.reserved;
  return (
    <section className="pc scan-hit">
      <div className="scan-img">
        {h.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- yetkili rota
          <img src={h.image} alt="" />
        ) : (
          <span aria-hidden="true">—</span>
        )}
      </div>
      <div className="scan-main">
        <p className="scan-by">
          {BY[by ?? ""] ?? ""} eşleşti{showTenant && <> · {h.tenantName}</>}
        </p>
        <h2 className="scan-name">{h.name}</h2>
        <p className="scan-meta mono">
          {h.sku} · {h.code}
          {h.ean && <> · EAN {h.ean}</>}
        </p>
        <dl className="scan-facts">
          <div>
            <dt>Raf</dt>
            <dd className={h.location ? "mono" : "scan-none"}>{h.location ?? "Atanmamış"}</dd>
          </div>
          <div>
            <dt>Depoda</dt>
            <dd>{h.quantity}</dd>
          </div>
          <div>
            <dt>Kullanılabilir</dt>
            <dd>{avail}</dd>
          </div>
        </dl>
        <p className="scan-actions">
          <a href={h.href}>Ürüne git →</a>
          <a href={`/api/etiket?u=${h.id}:1`} target="_blank" rel="noopener">
            Etiket bas
          </a>
        </p>
      </div>
    </section>
  );
}
