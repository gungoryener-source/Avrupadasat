/**
 * Ana sayfa görseli: müşteri panelinin TEMSİLÎ görünümü.
 * Harita gerçek ülke sınırlarından (Natural Earth) çizilir; sevkiyat aşamaları ve kayıt
 * adımları uygulamadaki gerçek adımlardır. Değerler örnektir ve "Örnek görünüm" etiketi
 * bu yüzden her zaman görünür kalır.
 */
import { CITIES, COUNTRIES, MAP_W } from "@/content/europe-map";
import { IconCheck } from "./Icons";

/** AB üyeleri (ISO 3166 sayısal) — haritada biraz daha koyu */
const EU = new Set([
  "040",
  "056",
  "100",
  "191",
  "196",
  "203",
  "208",
  "233",
  "246",
  "250",
  "276",
  "300",
  "348",
  "372",
  "380",
  "428",
  "440",
  "442",
  "470",
  "528",
  "616",
  "620",
  "642",
  "703",
  "705",
  "724",
  "752",
]);
const DE = "276";
const TR = "792";

type Pt = readonly [number, number];
function arc(a: Pt, b: Pt, lift: number) {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const cx = mx + (b[1] - a[1]) * lift;
  const cy = my - (b[0] - a[0]) * lift;
  return `M${a[0]},${a[1]} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b[0]},${b[1]}`;
}

const MARKETS: Pt[] = [
  CITIES.amsterdam,
  CITIES.paris,
  CITIES.wien,
  CITIES.warschau,
  CITIES.mailand,
  CITIES.kopenhagen,
  CITIES.madrid,
  CITIES.stockholm,
];

const STAGES = [
  { label: "Fabrika", state: "done" },
  { label: "TR çıkış", state: "done" },
  { label: "AB giriş", state: "done" },
  { label: "Gümrük", state: "now" },
  { label: "Depo", state: "todo" },
] as const;

const REG = [
  { label: "Şirket kaydı", value: "UG · Ticaret sicili", done: true },
  { label: "Vergi ve KDV", value: "USt-IdNr. alındı", done: true },
  { label: "Ambalaj (LUCID)", value: "Kayıt tamam", done: true },
  { label: "Ürün güvenliği", value: "Belgeler inceleniyor", done: false },
];

export function HeroVisual() {
  const hub = CITIES.frankfurt;
  const origin = CITIES.istanbul;
  return (
    <figure className="hv" aria-label="Müşteri panelinin örnek görünümü">
      <div className="hv__window">
        <div className="hv__top">
          <span className="hv__title">Avrupa operasyonunuz</span>
          <span className="hv__sample">Örnek görünüm</span>
        </div>

        <div className="hv__map">
          <svg
            viewBox={`0 40 ${MAP_W} 330`}
            role="img"
            aria-label="Türkiye'den Almanya'daki depoya, oradan AB pazarlarına rota"
          >
            <g className="hv__land">
              {COUNTRIES.map((c) => (
                <path
                  key={c.id + c.name}
                  d={c.d}
                  data-k={c.id === DE ? "de" : c.id === TR ? "tr" : EU.has(c.id) ? "eu" : "x"}
                />
              ))}
            </g>
            <g className="hv__spokes">
              {MARKETS.map((m) => (
                <path key={`${m[0]}-${m[1]}`} d={arc(hub, m, 0.14)} />
              ))}
            </g>
            <g className="hv__markets">
              {MARKETS.map((m) => (
                <circle key={`${m[0]}-${m[1]}`} cx={m[0]} cy={m[1]} r={3.2} />
              ))}
            </g>
            <path className="hv__route" d={arc(origin, hub, -0.22)} />
            <g className="hv__node hv__node--origin">
              <circle cx={origin[0]} cy={origin[1]} r={5.5} />
              <text x={origin[0] - 12} y={origin[1] - 12} textAnchor="end">
                İstanbul
              </text>
            </g>
            <g className="hv__node hv__node--hub">
              <circle className="hv__halo" cx={hub[0]} cy={hub[1]} r={13} />
              <circle cx={hub[0]} cy={hub[1]} r={6.5} />
              <text x={hub[0] - 16} y={hub[1] + 4} textAnchor="end">
                Almanya deposu
              </text>
            </g>
          </svg>

          <div className="hv__ship">
            <div className="hv__ship-head">
              <span>
                Sevkiyat <b>YT-2026-012</b>
              </span>
              <span className="hv__ship-meta">2 palet · 64 koli</span>
            </div>
            <ol className="hv__stages">
              {STAGES.map((s) => (
                <li key={s.label} data-state={s.state}>
                  <span className="hv__sdot" aria-hidden>
                    {s.state === "done" ? <IconCheck size={10} strokeWidth={3} /> : null}
                  </span>
                  {s.label}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="hv__cards">
          <div className="hv__card">
            <div className="hv__k">
              Kayıtlar <span>3 / 4</span>
            </div>
            <ul className="hv__status">
              {REG.map((s) => (
                <li key={s.label} data-done={s.done || undefined}>
                  <span className="hv__dot" aria-hidden>
                    {s.done ? <IconCheck size={11} strokeWidth={2.6} /> : null}
                  </span>
                  <span className="hv__sl">{s.label}</span>
                  <span className="hv__sv">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="hv__card">
            <div className="hv__k">Stok ve siparişler</div>
            <div className="hv__metric">
              <b>14</b>
              <span>palet Almanya&apos;da</span>
            </div>
            <dl className="hv__kv">
              <div>
                <dt>Bugün kargolanan</dt>
                <dd>38</dd>
              </div>
              <div>
                <dt>Amazon.de · eBay.de</dt>
                <dd>31 · 7</dd>
              </div>
              <div>
                <dt>İadeden satışa dönen</dt>
                <dd>4</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <figcaption className="hv__cap">
        Temsilî görünüm. Değerler örnektir, gerçek müşteri verisi değildir.
      </figcaption>
    </figure>
  );
}
