"use client";
import { useMemo, useState } from "react";
import {
  estimateFormation,
  estimateMonthly,
  formatEur,
  operations,
  pickPackRate,
} from "@avrupadasat/core/pricing";
import { track } from "@/components/consent";

export function Calculator() {
  const [pallets, setPallets] = useState(10);
  const [orders, setOrders] = useState(600);
  const [skus, setSkus] = useState(40);
  const [marketplace, setMarketplace] = useState(true);
  const [customerService, setCustomerService] = useState(false);
  const [accounting, setAccounting] = useState(false);
  const [form, setForm] = useState<"NONE" | "UG" | "GMBH">("UG");

  const e = useMemo(
    () =>
      estimateMonthly({
        pallets,
        ordersPerMonth: orders,
        skus,
        marketplace,
        customerService,
        accounting,
      }),
    [pallets, orders, skus, marketplace, customerService, accounting],
  );
  const pkg = marketplace ? "PAZARA_GIRIS" : "OPERASYON";
  const f = form === "NONE" ? null : estimateFormation(form, pkg);

  return (
    <div className="calc card" onChange={() => track("calculator_used")}>
      <div className="calc-in">
        <div className="field">
          <label htmlFor="c-pal">
            Depoda palet sayısı: <b>{pallets}</b>
          </label>
          <input
            id="c-pal"
            type="range"
            min={1}
            max={100}
            value={pallets}
            onChange={(ev) => setPallets(+ev.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="c-ord">
            Aylık sipariş: <b>{orders.toLocaleString("de-DE")}</b>
          </label>
          <input
            id="c-ord"
            type="range"
            min={0}
            max={5000}
            step={50}
            value={orders}
            onChange={(ev) => setOrders(+ev.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="c-sku">
            Ürün çeşidi (SKU): <b>{skus}</b>
          </label>
          <input
            id="c-sku"
            type="range"
            min={1}
            max={500}
            value={skus}
            onChange={(ev) => setSkus(+ev.target.value)}
          />
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={marketplace}
            onChange={(ev) => setMarketplace(ev.target.checked)}
          />{" "}
          <span>Amazon.de / eBay.de satışı ve pazarlama (Pazara Giriş)</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={customerService}
            onChange={(ev) => setCustomerService(ev.target.checked)}
          />{" "}
          <span>Almanca müşteri hizmetleri</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={accounting}
            onChange={(ev) => setAccounting(ev.target.checked)}
          />{" "}
          <span>Aylık muhasebe ve KDV beyanı takibi</span>
        </label>
        <div className="field">
          <label htmlFor="c-form">Almanya&apos;da şirket</label>
          <select
            id="c-form"
            value={form}
            onChange={(ev) => setForm(ev.target.value as typeof form)}
          >
            <option value="NONE">Kurmayacağım / mevcut</option>
            <option value="UG">UG kuracağım</option>
            <option value="GMBH">GmbH kuracağım</option>
          </select>
        </div>
      </div>
      <div className="calc-out" aria-live="polite">
        <div className="k" style={{ color: "#fff" }}>
          Tahmini aylık maliyet
        </div>
        <dl>
          <div>
            <dt>Depolama ({formatEur(operations.storagePerPalletMonth)}/palet)</dt>
            <dd>{formatEur(e.storage)}</dd>
          </div>
          <div>
            <dt>Pick &amp; pack ({formatEur(pickPackRate(orders), { decimals: true })}/sipariş)</dt>
            <dd>{formatEur(e.pickPack)}</dd>
          </div>
          <div>
            <dt>Paket ({marketplace ? "Pazara Giriş" : "Operasyon"})</dt>
            <dd>{formatEur(e.subscription)}</dd>
          </div>
          <div>
            <dt>Ek hizmetler</dt>
            <dd>{formatEur(e.extras)}</dd>
          </div>
        </dl>
        <div className="calc-total">{formatEur(e.total)}</div>
        <div style={{ opacity: 0.85 }}>
          {orders > 0 ? `Sipariş başına ≈ ${formatEur(e.perOrder, { decimals: true })}` : "—"} ·
          kargo hariç
        </div>
        {f && (
          <div className="calc-setup">
            <b>Tek seferlik kuruluş ({form === "UG" ? "UG" : "GmbH"})</b>
            <div>
              Hizmet bedeli {formatEur(f.serviceCents)} + noter, sicil, apostil ve tercüme ≈{" "}
              {formatEur(f.thirdPartyMinCents)}–{formatEur(f.thirdPartyMaxCents)}
            </div>
            <div className="calc-total" style={{ fontSize: 22 }}>
              {formatEur(f.totalMinCents)} – {formatEur(f.totalMaxCents)}
            </div>
            <small>{f.capitalNote}. Sermaye masraf değildir.</small>
          </div>
        )}
        <small style={{ display: "block", marginTop: 12, opacity: 0.8 }}>
          Tahmindir; KDV hariç. Kesin tutar teklifte.
        </small>
      </div>
    </div>
  );
}
