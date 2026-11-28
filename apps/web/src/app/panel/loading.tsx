/** Sayfa geçişlerinde iskelet (dönen simge yok) */
export default function Loading() {
  return (
    <div className="dash" aria-busy="true" aria-label="Yükleniyor">
      <div className="wc">
        <div className="sk sk-title" />
        <div className="sk sk-row" style={{ width: "50%" }} />
      </div>
      <div className="kpis">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="kpi">
            <div className="sk sk-row" style={{ width: "40%" }} />
            <div className="sk sk-num" />
          </div>
        ))}
      </div>
      <div className="wc">
        <div className="sk sk-title" />
        <div className="sk sk-chart" />
      </div>
    </div>
  );
}
