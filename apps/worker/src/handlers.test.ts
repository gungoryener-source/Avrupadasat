import { describe, expect, it, vi } from "vitest";
import { MAX_ATTEMPTS, processRow, type Ports } from "./handlers";

const lead = {
  companyName: "Koza İpek",
  email: "info@koza.com.tr",
  phone: "+90 224 000 00 00",
  category: "tekstil",
  consentKvkk: true,
};

const row = (over: Partial<Parameters<typeof processRow>[0]> = {}) => ({
  id: "e1",
  type: "lead.submitted.v1",
  tenantId: null,
  payload: lead,
  attempts: 0,
  ...over,
});

describe("outbox işleyici", () => {
  it("lead olayını işler, kişisel veriyi bildirimlere koymaz", async () => {
    const notify = vi.fn<Ports["notify"]>().mockResolvedValue();
    expect(await processRow(row(), { notify })).toEqual({ kind: "done" });
    expect(notify).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(notify.mock.calls)).not.toContain("info@koza.com.tr");
  });

  it("geçici hatada yeniden dener, limitte bırakır", async () => {
    const notify = vi.fn<Ports["notify"]>().mockRejectedValue(new Error("SMTP kapalı"));
    expect((await processRow(row(), { notify })).kind).toBe("retry");
    expect((await processRow(row({ attempts: MAX_ATTEMPTS - 1 }), { notify })).kind).toBe("dead");
  });

  it("geçersiz yükü yeniden denemeden bırakır", async () => {
    const notify = vi.fn<Ports["notify"]>().mockResolvedValue();
    expect(await processRow(row({ payload: { email: "x" } }), { notify })).toEqual({
      kind: "dead",
      error: "Geçersiz olay yükü",
    });
    expect(notify).not.toHaveBeenCalled();
  });

  it("bilinmeyen türü doğrudan bırakır", async () => {
    const notify = vi.fn<Ports["notify"]>();
    expect((await processRow(row({ type: "x.y.v1" }), { notify })).kind).toBe("dead");
  });
});
