import { describe, expect, it } from "vitest";
import { createPusher, EXPO_PUSH_URL } from "./push";
import { processRow, type Ports } from "./handlers";

describe("Expo anlık bildirim", () => {
  it("canlı modda 100'erli gruplar gönderir, DeviceNotRegistered anahtarlarını döner", async () => {
    const bodies: { to: string; title: string; data: unknown }[][] = [];
    const f = (async (url: string, init: RequestInit) => {
      expect(url).toBe(EXPO_PUSH_URL);
      expect((init.headers as Record<string, string>).authorization).toBe("Bearer expo-at");
      const b = JSON.parse(String(init.body));
      bodies.push(b);
      return Response.json({
        data: b.map((m: { to: string }) =>
          m.to.includes("olu")
            ? { status: "error", details: { error: "DeviceNotRegistered" } }
            : { status: "ok", id: "x" },
        ),
      });
    }) as unknown as typeof fetch;
    const tokens = Array.from(
      { length: 101 },
      (_, i) => `ExponentPushToken[${i === 100 ? "olu" : "ok"}${i}aaaaaaaa]`,
    );
    const push = createPusher(
      { PUSH_MODE: "live", EXPO_ACCESS_TOKEN: "expo-at" } as unknown as NodeJS.ProcessEnv,
      () => undefined,
      f,
    );
    const r = await push(tokens, {
      title: "Sevkiyatınız depoda",
      body: "Ayrıntılar uygulamada.",
      screen: "shipments",
    });
    expect(bodies.map((b) => b.length)).toEqual([100, 1]);
    expect(bodies[0]![0]).toMatchObject({
      title: "Sevkiyatınız depoda",
      data: { screen: "shipments" },
    });
    expect(r.invalid).toEqual(["ExponentPushToken[olu100aaaaaaaa]"]);
  });

  it("mock modda yalnız cihaz sayısını loglar (anahtar yazılmaz)", async () => {
    const logs: string[] = [];
    const push = createPusher({} as NodeJS.ProcessEnv, (s) => logs.push(s), (() => {
      throw new Error("ağ çağrısı yapılmamalı");
    }) as unknown as typeof fetch);
    await push(["ExponentPushToken[abcdefghijkl]"], { title: "T", body: "B" });
    expect(logs).toEqual(["[mock:push] T → 1 cihaz"]);
  });

  it("bildirim hatası olayı yeniden denetmez; e-posta bir kez gider", async () => {
    const sent: string[] = [];
    const ports: Ports = {
      appUrl: "https://x.test",
      sendMail: async (to) => void sent.push(to),
      tenantRecipients: async () => ["sahip@firma.de"],
      opsRecipients: [],
      decrypt: (s) => s,
      sendPush: async () => {
        throw new Error("Expo kapalı");
      },
    };
    const out = await processRow(
      {
        id: "1",
        type: "shipment.status_changed.v1",
        tenantId: "t1",
        payload: { shipmentId: "s1", stage: "DEPO_KABUL", at: "2026-11-25T10:00:00.000Z" },
        attempts: 0,
      },
      ports,
    );
    expect(out).toEqual({ kind: "done" });
    expect(sent).toEqual(["sahip@firma.de"]);
  });
});

describe("hesap silme bildirimi", () => {
  it("son sahip silinince yalnız ekibe, kişisel veri içermeyen e-posta gider", async () => {
    const sent: { to: string; text: string }[] = [];
    const ports: Ports = {
      appUrl: "https://x.test",
      sendMail: async (to, m) => void sent.push({ to, text: m.text }),
      tenantRecipients: async () => ["sahip@firma.de"],
      opsRecipients: ["ops@ekip.de"],
      decrypt: (s) => s,
    };
    const out = await processRow(
      {
        id: "2",
        type: "account.deletion_requested.v1",
        tenantId: "t9",
        payload: { reason: "last_owner_deleted" },
        attempts: 0,
      },
      ports,
    );
    expect(out).toEqual({ kind: "done" });
    expect(sent.map((s) => s.to)).toEqual(["ops@ekip.de"]);
    expect(sent[0]!.text).toContain("t9");
  });
});
