/**
 * Ana sayfa görseli: Avrupa operasyon panelinin TEMSİLÎ görünümü.
 * Gerçek veriye bağlı değildir; "Örnek görünüm" etiketi bu yüzden görünür kalır.
 * Harita, şehirlerin gerçek koordinatlarından basit bir izdüşümle çizilir.
 */
import { IconCheck } from "./Icons";

const W = 420;
const H = 300;
/** Boylam -11…33, enlem 37…61 → görünüm kutusu */
function project(lon: number, lat: number): [number, number] {
  const x = ((lon + 11) / 44) * W;
  const y = ((61 - lat) / 24) * H;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

const HUB = { name: "Almanya", lon: 8.68, lat: 50.11 }; // Frankfurt bölgesi
const ORIGIN = { name: "Türkiye", lon: 28.98, lat: 41.01 }; // İstanbul
const MARKETS = [
  { code: "NL", lon: 4.9, lat: 52.37 },
  { code: "BE", lon: 4.35, lat: 50.85 },
  { code: "FR", lon: 2.35, lat: 48.86 },
  { code: "AT", lon: 16.37, lat: 48.21 },
  { code: "PL", lon: 21.01, lat: 52.23 },
  { code: "IT", lon: 9.19, lat: 45.46 },
  { code: "DK", lon: 12.57, lat: 55.68 },
  { code: "ES", lon: -3.7, lat: 40.42 },
  { code: "SE", lon: 18.07, lat: 59.33 },
  { code: "CZ", lon: 14.42, lat: 50.08 },
];
/** Almanya içindeki noktalar (vurgulu bölge) */
const DE_POINTS = [
  [13.4, 52.52],
  [9.99, 53.55],
  [11.58, 48.14],
  [6.96, 50.94],
  [9.18, 48.78],
  [12.37, 51.34],
  [7.47, 51.51],
  [8.8, 53.08],
  [10.0, 51.3],
  [11.0, 49.45],
  [7.1, 49.8],
] as const;

/** Arka plan nokta ızgarası: kara kütlesine yakın kaba bir maske */
function landish(lon: number, lat: number) {
  if (lat > 58.5 && lon < 4) return false;
  if (lat < 43.6 && lon > 2 && lon < 7) return false; // Akdeniz
  if (lat < 42 && lon > 15 && lon < 20) return false; // İyon Denizi
  if (lat > 54.8 && lon > 13.5 && lon < 17) return false; // Baltık
  if (lat < 38.4) return false;
  if (lon < -9.5) return false;
  if (lat > 50.5 && lon < 2) return lon > -5.5 && lat < 58.5; // Britanya
  if (lat > 44 && lat < 49 && lon < -1.5) return false; // Biskay
  return true;
}

const GRID: [number, number][] = [];
for (let lat = 59.5; lat >= 38; lat -= 1.5) {
  for (let lon = -10; lon <= 32; lon += 1.5) {
    if (landish(lon, lat)) GRID.push(project(lon, lat));
  }
}

function arc(a: [number, number], b: [number, number], lift = 0.22) {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const cx = mx + dy * lift;
  const cy = my - dx * lift;
  return `M${a[0]},${a[1]} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b[0]},${b[1]}`;
}

const STATUS = [
  { label: "Şirket kaydı", value: "UG · Ticaret sicili", state: "done" as const },
  { label: "Vergi ve KDV", value: "USt-IdNr. alındı", state: "done" as const },
  { label: "Ambalaj (LUCID)", value: "Kayıt tamam", state: "done" as const },
  { label: "Ürün güvenliği (GPSR)", value: "Belgeler inceleniyor", state: "wip" as const },
];

const BARS = [38, 52, 47, 61, 58, 72, 69, 84, 78, 90, 86, 97];

export function HeroVisual() {
  const hub = project(HUB.lon, HUB.lat);
  const origin = project(ORIGIN.lon, ORIGIN.lat);
  return (
    <figure className="hv" aria-label="Avrupa operasyon panelinin örnek görünümü">
      <div className="hv__window">
        <div className="hv__top">
          <span className="hv__title">Avrupa operasyonu</span>
          <span className="hv__sample">Örnek görünüm</span>
        </div>

        <div className="hv__map">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label="Türkiye'den Almanya'ya, oradan Avrupa pazarlarına rota"
          >
            <g className="hv__grid">
              {GRID.map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={1.3} />
              ))}
            </g>
            <g className="hv__de">
              {DE_POINTS.map(([lon, lat]) => {
                const [x, y] = project(lon, lat);
                return <circle key={`${lon}`} cx={x} cy={y} r={2.6} />;
              })}
            </g>
            <g className="hv__spokes">
              {MARKETS.map((m) => {
                const p = project(m.lon, m.lat);
                return <path key={m.code} d={arc(hub, p, 0.12)} />;
              })}
            </g>
            <path className="hv__route" d={arc(origin, hub, -0.28)} />
            <g className="hv__markets">
              {MARKETS.map((m) => {
                const [x, y] = project(m.lon, m.lat);
                return (
                  <g key={m.code}>
                    <circle cx={x} cy={y} r={3} />
                    <text x={x + 6} y={y + 3.5}>
                      {m.code}
                    </text>
                  </g>
                );
              })}
            </g>
            <g className="hv__node hv__node--origin">
              <circle cx={origin[0]} cy={origin[1]} r={5} />
              <text x={origin[0] - 8} y={origin[1] + 18} textAnchor="middle">
                {ORIGIN.name}
              </text>
            </g>
            <g className="hv__node hv__node--hub">
              <circle className="hv__pulse" cx={hub[0]} cy={hub[1]} r={12} />
              <circle cx={hub[0]} cy={hub[1]} r={6} />
              <text x={hub[0] + 12} y={hub[1] - 10}>
                {HUB.name}
              </text>
            </g>
          </svg>
        </div>

        <div className="hv__cards">
          <div className="hv__card">
            <div className="hv__k">Uyum ve kayıtlar</div>
            <ul className="hv__status">
              {STATUS.map((s) => (
                <li key={s.label} data-state={s.state}>
                  <span className="hv__dot" aria-hidden>
                    {s.state === "done" ? <IconCheck size={12} strokeWidth={2.4} /> : null}
                  </span>
                  <span className="hv__sl">{s.label}</span>
                  <span className="hv__sv">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="hv__card">
            <div className="hv__k">Depo · Almanya</div>
            <div className="hv__metric">
              <b>14</b>
              <span>palet stokta</span>
            </div>
            <div className="hv__bar" aria-hidden>
              <span style={{ width: "72%" }} />
            </div>
            <div className="hv__sub">Bugünkü siparişler: 38 hazırlandı · 6 bekliyor</div>
          </div>
          <div className="hv__card hv__card--wide">
            <div className="hv__k">Pazaryeri siparişleri · son 12 hafta</div>
            <div className="hv__chart" aria-hidden>
              {BARS.map((h, i) => (
                <span key={i} style={{ height: `${h}%` }}>
                  <i style={{ height: `${28 + (i % 3) * 4}%` }} />
                </span>
              ))}
            </div>
            <div className="hv__legend">
              <span>
                <i className="l1" /> Amazon.de
              </span>
              <span>
                <i className="l2" /> eBay.de
              </span>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="hv__cap">
        Temsilî görünümdür; gösterilen değerler örnektir, gerçek müşteri verisi değildir.
      </figcaption>
    </figure>
  );
}
