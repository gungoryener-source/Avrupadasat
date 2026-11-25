import { eventSchemas, type EventType } from "@avrupadasat/core/events";
import { STAGE_LABEL, STEP_LABEL, STEP_STATUS } from "@avrupadasat/core/labels";
import { formatEur } from "@avrupadasat/core/pricing";
import type { PushMessage } from "./push";
import { templates, type Mail } from "./templates";

export interface OutboxRow {
  id: string;
  type: string;
  tenantId: string | null;
  payload: unknown;
  attempts: number;
}

export interface Ports {
  appUrl: string;
  /** Tek alıcıya e-posta (gerçek SMTP veya mock) */
  sendMail(to: string, mail: Mail): Promise<void>;
  /** Firma sahiplerinin e-postaları (bildirimler için) */
  tenantRecipients(tenantId: string): Promise<string[]>;
  /** Ekip bildirim adresleri (OPS_EMAIL) */
  opsRecipients: string[];
  decrypt(tokenEnc: string): string;
  /** Firma kullanıcılarının mobil cihazlarına anlık bildirim (isteğe bağlı, en iyi çaba) */
  sendPush?(tenantId: string, msg: PushMessage): Promise<void>;
}

export const MAX_ATTEMPTS = 5;

type Handler = (payload: unknown, row: OutboxRow, ports: Ports) => Promise<void>;

async function toTenant(ports: Ports, tenantId: string | null, mail: Mail, screen?: string) {
  if (!tenantId) return;
  for (const to of await ports.tenantRecipients(tenantId)) await ports.sendMail(to, mail);
  // Bildirim hatası olayı yeniden denetmez (aksi hâlde e-posta tekrar giderdi)
  await ports
    .sendPush?.(tenantId, { title: mail.subject, body: "Ayrıntılar uygulamada.", screen })
    .catch((e: unknown) =>
      console.error("[push] gönderilemedi", e instanceof Error ? e.message : e),
    );
}

async function toOps(ports: Ports, subject: string, lines: string[]) {
  const mail = templates.ops(subject, lines, `${ports.appUrl}/admin`);
  for (const to of ports.opsRecipients) await ports.sendMail(to, mail);
}

const handlers: Partial<Record<EventType, Handler>> = {
  "account.deletion_requested.v1": async (payload, row, ports) => {
    eventSchemas["account.deletion_requested.v1"].parse(payload);
    await toOps(ports, "Hesap silme: firmanın sahibi kalmadı", [
      `Firma kimliği: ${row.tenantId ?? "-"}`,
      "Son firma sahibi hesabını sildi. Firma verilerinin silinmesi/saklanması yasal saklama süreleri dikkate alınarak karara bağlanmalı.",
    ]);
  },
  "lead.submitted.v1": async (payload, _row, ports) => {
    const p = eventSchemas["lead.submitted.v1"].parse(payload);
    await ports.sendMail(p.email, templates.leadReceived(p.companyName));
    // Ekip bildiriminde kişisel veri yok: firma adı ve kategori
    await toOps(ports, "Yeni uygunluk raporu talebi", [
      `Firma: ${p.companyName}`,
      `Kategori: ${p.category}`,
      `Kaynak: ${p.attribution.gclid ? "Google Ads" : (p.attribution.utmSource ?? "doğrudan")}`,
    ]);
  },
  "user.invited.v1": async (payload, _row, ports) => {
    const p = eventSchemas["user.invited.v1"].parse(payload);
    const link = `${ports.appUrl}/sifre/${ports.decrypt(p.tokenEnc)}`;
    await ports.sendMail(
      p.email,
      p.purpose === "INVITE" ? templates.invite(link) : templates.reset(link),
    );
  },
  "quote.sent.v1": async (payload, _row, ports) => {
    const p = eventSchemas["quote.sent.v1"].parse(payload);
    await ports.sendMail(
      p.email,
      templates.quote(p.number, `${ports.appUrl}/teklif/${ports.decrypt(p.tokenEnc)}`),
    );
  },
  "quote.accepted.v1": async (payload, _row, ports) => {
    const p = eventSchemas["quote.accepted.v1"].parse(payload);
    await toOps(ports, "Teklif onaylandı — onboarding başlat", [`Paket: ${p.packageCode}`]);
  },
  "registration.status_changed.v1": async (payload, row, ports) => {
    const p = eventSchemas["registration.status_changed.v1"].parse(payload);
    await toTenant(
      ports,
      row.tenantId,
      templates.registration(
        STEP_LABEL[p.step],
        STEP_STATUS[p.status],
        p.note,
        `${ports.appUrl}/panel/sirket`,
      ),
      "home",
    );
  },
  "shipment.status_changed.v1": async (payload, row, ports) => {
    const p = eventSchemas["shipment.status_changed.v1"].parse(payload);
    await toTenant(
      ports,
      row.tenantId,
      templates.shipment(STAGE_LABEL[p.stage], `${ports.appUrl}/panel/sevkiyatlar/${p.shipmentId}`),
      "shipments",
    );
  },
  "invoice.issued.v1": async (payload, row, ports) => {
    const p = eventSchemas["invoice.issued.v1"].parse(payload);
    await toTenant(
      ports,
      row.tenantId,
      templates.invoice(
        p.number,
        formatEur(p.grossCents, { decimals: true }),
        `${ports.appUrl}/panel/faturalar`,
      ),
      "home",
    );
  },
  // Yalnız kayıt amaçlı olaylar: bildirim yok
  "order.created.v1": async () => undefined,
  "order.shipped.v1": async () => undefined,
  "return.processed.v1": async () => undefined,
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
