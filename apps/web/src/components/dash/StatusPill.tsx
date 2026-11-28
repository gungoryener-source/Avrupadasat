import type { OrderStatus } from "@avrupadasat/db";

/** Sipariş durumu: renk + ikon şekli + metin (yalnız renge dayanmaz) */
const MAP: Record<OrderStatus, { label: string; tone: string; glyph: string }> = {
  NEW: { label: "Alındı", tone: "info", glyph: "○" },
  ON_HOLD: { label: "Stok bekliyor", tone: "err", glyph: "!" },
  ALLOCATED: { label: "Hazırlanıyor", tone: "warn", glyph: "◔" },
  PACKED: { label: "Paketlendi", tone: "warn", glyph: "◑" },
  SHIPPED: { label: "Kargoda", tone: "info", glyph: "→" },
  DELIVERED: { label: "Teslim edildi", tone: "ok", glyph: "✓" },
  RETURNED: { label: "İade", tone: "neutral", glyph: "↩" },
  CANCELLED: { label: "İptal", tone: "neutral", glyph: "×" },
};

export function StatusPill({ status, label }: { status: OrderStatus; label?: string }) {
  const m = MAP[status];
  return (
    <span className={`pill pill-${m.tone}`}>
      <span className="pill-g" aria-hidden="true">
        {m.glyph}
      </span>
      {label ?? m.label}
    </span>
  );
}
