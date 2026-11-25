import { describe, expect, it, vi } from "vitest";
import { MAX_ATTEMPTS, processRow, type Ports } from "./handlers";
import type { Mail } from "./templates";

const lead = {
  companyName: "Koza <İpek>",
  email: "info@koza.com.tr",
  phone: "+90 224 000 00 00",
  category: "tekstil",
  consentKvkk: true,
  attribution: {},
};

const row = (over: Partial<Parameters<typeof processRow>[0]> = {}) => ({
  id: "e1",
  type: "lead.submitted.v1",
  tenantId: null,
  payload: lead,
  attempts: 0,
  ...over,
});

function ports(over: Partial<Ports> = {}) {
  const sent: { to: string; mail: Mail }[] = [];
  const p: Ports = {
    appUrl: "https://x.test",
    decrypt: (t) => t.toUpperCase(),
    sendMail: vi.fn(async (to: string, mail: Mail) => void sent.push({ to, mail })),
    tenantRecipients: async () => ["sahip@firma.test"],
    opsRecipients: ["ops@avrupadasat.test"],
    ...over,
  };
  return { p, sent };
}

describe("outbox işleyici", () => {
  it("talep: müşteriye onay, ekibe bildirim; ekip e-postasında müşteri e-postası/telefonu yok; HTML kaçışlı", async () => {
    const { p, sent } = ports();
    expect(await processRow(row(), p)).toEqual({ kind: "done" });
    expect(sent.map((s) => s.to)).toEqual(["info@koza.com.tr", "ops@avrupadasat.test"]);
    const ops = sent[1]!.mail;
    expect(ops.text).not.toContain("info@koza.com.tr");
    expect(ops.text).not.toContain("224");
    expect(sent[0]!.mail.html).toContain("Koza &lt;İpek&gt;");
    expect(sent[0]!.mail.html).not.toContain("<İpek>");
  });

  it("davet: çözülmüş bağlantıyla, düz metin ve HTML'de", async () => {
    const { p, sent } = ports();
    const r = await processRow(
      row({
        type: "user.invited.v1",
        payload: { userId: "u", email: "a@b.co", purpose: "INVITE", tokenEnc: "abc" },
      }),
      p,
    );
    expect(r).toEqual({ kind: "done" });
    expect(sent[0]!.mail.subject).toBe("Müşteri panelinize davet edildiniz");
    expect(sent[0]!.mail.text).toContain("https://x.test/sifre/ABC");
    expect(sent[0]!.mail.html).toContain('href="https://x.test/sifre/ABC"');
  });

  it("kayıt adımı, sevkiyat ve fatura olayları firma sahiplerine gider", async () => {
    const { p, sent } = ports();
    await processRow(
      row({
        type: "registration.status_changed.v1",
        tenantId: "t",
        payload: { step: "VERGI_NO", status: "TAMAM" },
      }),
      p,
    );
    await processRow(
      row({
        type: "shipment.status_changed.v1",
        tenantId: "t",
        payload: { shipmentId: "s1", stage: "GUMRUK", at: new Date().toISOString() },
      }),
      p,
    );
    await processRow(
      row({
        type: "invoice.issued.v1",
        tenantId: "t",
        payload: { invoiceId: "i", number: "AS-R-2026-00001", grossCents: 119_00 },
      }),
      p,
    );
    expect(sent.map((s) => s.mail.subject)).toEqual([
      "Kayıt adımı güncellendi: Vergi numarası (Steuernummer)",
      "Sevkiyat güncellemesi: Alman gümrüğü",
      "Yeni fatura: AS-R-2026-00001",
    ]);
    expect(sent.every((s) => s.to === "sahip@firma.test")).toBe(true);
    expect(sent[2]!.mail.text).toContain("€119,00");
  });

  it("SMTP hatasında yeniden dener, limitte bırakır", async () => {
    const { p } = ports({ sendMail: vi.fn().mockRejectedValue(new Error("SMTP kapalı")) });
    expect((await processRow(row(), p)).kind).toBe("retry");
    expect((await processRow(row({ attempts: MAX_ATTEMPTS - 1 }), p)).kind).toBe("dead");
  });

  it("geçersiz yükü yeniden denemeden bırakır; bilinmeyen tür bırakılır", async () => {
    const { p, sent } = ports();
    expect(await processRow(row({ payload: { email: "x" } }), p)).toEqual({
      kind: "dead",
      error: "Geçersiz olay yükü",
    });
    expect((await processRow(row({ type: "x.y.v1" }), p)).kind).toBe("dead");
    expect(sent).toHaveLength(0);
  });
});
