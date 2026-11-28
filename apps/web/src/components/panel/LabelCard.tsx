import { code128Svg } from "@/server/barcode";
import { LABEL_FORMATS } from "@/server/label-pdf";
import { Card } from "./ui";

/**
 * Ürün etiket kartı: platform etiket kodu, barkod önizlemesi ve PDF basma formu.
 * Kod veritabanında üretilir ve yalnız [0-9A-Z] içerir; SVG sunucuda üretildiği için güvenle gömülür.
 */
export function LabelCard({ id, code }: { id: string; code: string }) {
  return (
    <Card title="Depo etiketi">
      <div className="lbl-bar" dangerouslySetInnerHTML={{ __html: code128Svg(code, 40) }} />
      <p className="lbl-code mono">{code}</p>
      <p className="muted lbl-help">
        Depoya gönderdiğiniz her ürün adedinin üzerine bu etiketi yapıştırın. Depo ürünü bu kodla
        tanır; aynı EAN&apos;lı başka firmaların ürünleriyle karışmaz.
      </p>
      <form className="lbl-form" action="/api/etiket" method="get" target="_blank">
        <div className="field">
          <label htmlFor={`n_${id}`}>Adet</label>
          <input
            id={`n_${id}`}
            name={`n_${id}`}
            type="number"
            min={1}
            max={500}
            defaultValue={1}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="bicim">Etiket</label>
          <select id="bicim" name="bicim" defaultValue="termal">
            {Object.entries(LABEL_FORMATS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-p btn-sm" type="submit">
          Etiket PDF&apos;i oluştur
        </button>
      </form>
    </Card>
  );
}
