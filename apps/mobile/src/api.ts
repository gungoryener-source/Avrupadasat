/** Avrupadasat mobil API istemcisi (web uygulamasındaki /api/v1 uç noktaları) */

export type Stage = "FABRIKA" | "TR_CIKIS" | "AB_GIRIS" | "GUMRUK" | "DEPO_KABUL";

export interface Overview {
  units: number;
  skus: number;
  activeShipments: number;
  pendingSteps: number;
  salesLocked: boolean;
  missingDocs: { id: string; reference: string; missing: string[] }[];
  lowStock: { sku: string; name: string; quantity: number }[];
  waiting: { id: string; title: string; done: boolean }[];
  sales: { days: number; revenueCents: number; orders: number; changePct: number | null };
}

export interface ShipmentRow {
  id: string;
  reference: string;
  stage: Stage;
  pallets: number;
  cartons: number;
  expectedAt: string | null;
  receivedAt: string | null;
}

export interface ShipmentDetail extends ShipmentRow {
  events: { stage: Stage; at: string; note: string | null }[];
  lines: { sku: string; quantity: number; receivedQty: number | null; damagedQty: number }[];
  missingDocs: string[];
}

export interface StockItem {
  sku: string;
  name: string;
  quantity: number;
  reserved: number;
  available: number;
}

export interface OrderRow {
  id: string;
  channel: string;
  externalId: string;
  status: string;
  itemsCents: number;
  carrier: string | null;
  trackingNo: string | null;
  orderedAt: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Fetch = typeof fetch;

export function createApi(
  baseUrl: string,
  getToken: () => string | null,
  fetchImpl: Fetch = fetch,
) {
  const base = baseUrl.replace(/\/$/, "");
  if (
    !/^https:\/\//.test(base) &&
    !/^http:\/\/(localhost|10\.0\.2\.2|127\.0\.0\.1)(:\d+)?$/.test(base)
  ) {
    throw new Error("API adresi HTTPS olmalı");
  }
  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = getToken();
    const res = await fetchImpl(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (res.status === 204) return undefined as T;
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new ApiError(res.status, body.error ?? "Bağlantı hatası");
    return body as T;
  }
  return {
    login: (email: string, password: string, code?: string) =>
      call<{ token: string; expiresAt: string }>("/api/v1/auth", {
        method: "POST",
        body: JSON.stringify({ email, password, code: code || undefined }),
      }),
    logout: () => call<void>("/api/v1/auth", { method: "DELETE" }),
    registerPush: (token: string) =>
      call<void>("/api/v1/push", { method: "PUT", body: JSON.stringify({ token }) }),
    me: () => call<{ name: string; role: string; tenant: { name: string } }>("/api/v1/me"),
    overview: () => call<Overview>("/api/v1/overview"),
    shipments: () =>
      call<{ shipments: ShipmentRow[] }>("/api/v1/shipments").then((r) => r.shipments),
    shipment: (id: string) => call<ShipmentDetail>(`/api/v1/shipments/${encodeURIComponent(id)}`),
    stock: () => call<{ items: StockItem[] }>("/api/v1/stock").then((r) => r.items),
    orders: () => call<{ orders: OrderRow[] }>("/api/v1/orders").then((r) => r.orders),
  };
}

export type Api = ReturnType<typeof createApi>;

export const STAGE_LABEL: Record<Stage, string> = {
  FABRIKA: "Fabrikadan çıkış",
  TR_CIKIS: "Türkiye çıkış gümrüğü",
  AB_GIRIS: "AB giriş",
  GUMRUK: "Alman gümrüğü",
  DEPO_KABUL: "Depoya kabul",
};

export const DOC_LABEL: Record<string, string> = {
  TICARI_FATURA: "Ticari fatura",
  CEKI_LISTESI: "Çeki listesi",
  ATR: "A.TR",
  CMR: "CMR",
};

export const ORDER_LABEL: Record<string, string> = {
  NEW: "Yeni",
  ON_HOLD: "Beklemede",
  ALLOCATED: "Hazırlanıyor",
  SHIPPED: "Kargoda",
  DELIVERED: "Teslim edildi",
  CANCELLED: "İptal",
};

export function eur(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export function trDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

const SCREENS = ["home", "shipments", "stock", "orders"] as const;
export type Screen = (typeof SCREENS)[number];

/** Bildirimdeki ekran adını doğrular (bilinmeyen değer yok sayılır) */
export function screenFromNotification(data: unknown): Screen | null {
  const s = (data as { screen?: unknown } | null)?.screen;
  return typeof s === "string" && (SCREENS as readonly string[]).includes(s) ? (s as Screen) : null;
}
