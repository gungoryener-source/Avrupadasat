import { eventSchemas, type EventType } from "@avrupadasat/core/events";

export interface OutboxRow {
  id: string;
  type: string;
  tenantId: string | null;
  payload: unknown;
  attempts: number;
}

export interface Ports {
  /** E-posta, bildirim vb. — mock modunda yalnız kaydeder */
  notify(channel: "email" | "crm", subject: string, body: Record<string, unknown>): Promise<void>;
  /** Kişiye özel bağlantı içeren e-posta; bağlantı loglanmaz */
  sendLinkEmail?(to: string, subject: string, link: string): Promise<void>;
  decrypt?(tokenEnc: string): string;
  appUrl?: string;
}

export const MAX_ATTEMPTS = 5;

type Handler = (payload: unknown, row: OutboxRow, ports: Ports) => Promise<void>;

const handlers: Partial<Record<EventType, Handler>> = {
  "lead.submitted.v1": async (payload, row, ports) => {
    const p = eventSchemas["lead.submitted.v1"].parse(payload);
    // Kişisel veri loglanmaz; yalnızca kimlik ve kategori
    await ports.notify("crm", "Yeni uygunluk raporu talebi", {
      eventId: row.id,
      category: p.category,
    });
    await ports.notify("email", "Talebiniz alındı", { eventId: row.id });
  },
  "user.invited.v1": async (payload, _row, ports) => {
    const p = eventSchemas["user.invited.v1"].parse(payload);
    if (!ports.sendLinkEmail || !ports.decrypt) throw new Error("E-posta portu yok");
    const link = `${ports.appUrl}/sifre/${ports.decrypt(p.tokenEnc)}`;
    await ports.sendLinkEmail(
      p.email,
      p.purpose === "INVITE" ? "Müşteri panelinize davet edildiniz" : "Şifre sıfırlama bağlantınız",
      link,
    );
  },
  "quote.sent.v1": async (payload, _row, ports) => {
    const p = eventSchemas["quote.sent.v1"].parse(payload);
    if (!ports.sendLinkEmail || !ports.decrypt) throw new Error("E-posta portu yok");
    await ports.sendLinkEmail(
      p.email,
      `Teklifiniz hazır: ${p.number}`,
      `${ports.appUrl}/teklif/${ports.decrypt(p.tokenEnc)}`,
    );
  },
  "quote.accepted.v1": async (payload, row, ports) => {
    const p = eventSchemas["quote.accepted.v1"].parse(payload);
    await ports.notify("crm", "Teklif onaylandı — onboarding başlat", {
      tenantId: row.tenantId,
      package: p.packageCode,
    });
  },
  "registration.status_changed.v1": async (payload, row, ports) => {
    const p = eventSchemas["registration.status_changed.v1"].parse(payload);
    await ports.notify("email", "Kayıt adımınız güncellendi", {
      tenantId: row.tenantId,
      step: p.step,
      status: p.status,
    });
  },
};

export type Outcome =
  { kind: "done" } | { kind: "retry"; error: string } | { kind: "dead"; error: string };

export async function processRow(row: OutboxRow, ports: Ports): Promise<Outcome> {
  const handler = handlers[row.type as EventType];
  if (!handler) return { kind: "dead", error: `Bilinmeyen olay türü: ${row.type}` };
  try {
    await handler(row.payload, row, ports);
    return { kind: "done" };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    // Şema hatası kalıcıdır; yeniden denemek düzeltmez
    if (e instanceof Error && e.name === "ZodError")
      return { kind: "dead", error: "Geçersiz olay yükü" };
    return row.attempts + 1 >= MAX_ATTEMPTS ? { kind: "dead", error } : { kind: "retry", error };
  }
}
