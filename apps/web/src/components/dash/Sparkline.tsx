/** Mini çizgi grafik (bağımlılıksız SVG). Dekoratif: anlamı yanındaki rakam ve yüzde taşır. */
export function Sparkline({
  values,
  tone = "accent",
  width = 96,
  height = 32,
}: {
  values: number[];
  tone?: "accent" | "ok" | "err" | "mute";
  width?: number;
  height?: number;
}) {
  if (values.length < 2 || values.every((v) => v === values[0])) {
    return (
      <svg className={`spark spark-${tone}`} width={width} height={height} aria-hidden="true">
        <line x1="0" x2={width} y1={height - 2} y2={height - 2} className="spark-flat" />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 2 - ((v - min) / span) * (height - 4)]);
  const line = pts.map(([x, y]) => `${x!.toFixed(1)},${y!.toFixed(1)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  return (
    <svg
      className={`spark spark-${tone}`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <polygon points={area} className="spark-area" />
      <polyline points={line} className="spark-line" />
    </svg>
  );
}
