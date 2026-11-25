import { afterAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/deep/route";
import { db } from "./db";
import { deepHealth, LIMITS } from "./health";

const run = `hl${Date.now()}`;

describe.skipIf(!process.env.DATABASE_URL)("derin sağlık kontrolü", () => {
  afterAll(async () => {
    await db().outboxEvent.deleteMany({ where: { idempotencyKey: { startsWith: run } } });
    await db().systemHeartbeat.deleteMany({ where: { name: "worker" } });
  });

  it("nabız yoksa down; taze nabızla worker sorunu yok; eski bekleyen olay down; dead olay warn", async () => {
    await db().systemHeartbeat.deleteMany({ where: { name: "worker" } });
    const now = new Date();
    let r = await deepHealth(now);
    expect(r.status).toBe("down");
    expect(r.problems.some((p) => /Worker/.test(p))).toBe(true);

    await db().systemHeartbeat.create({
      data: { name: "worker", seenAt: new Date(now.getTime() - 10_000) },
    });
    r = await deepHealth(now);
    expect(r.checks).toMatchObject({ database: true, workerLastSeenSec: 10 });
    expect(r.problems.some((p) => /Worker/.test(p))).toBe(false);
    const base = r.checks;

    await db().outboxEvent.create({
      data: { type: "x", payload: {}, idempotencyKey: `${run}-dead`, attempts: 5 },
    });
    r = await deepHealth(now);
    expect(r.checks.outboxDead).toBe(base.outboxDead + 1);
    expect(["warn", "down"]).toContain(r.status);
    expect(r.problems.some((p) => /kalıcı olarak başarısız/.test(p))).toBe(true);

    await db().outboxEvent.create({
      data: {
        type: "x",
        payload: {},
        idempotencyKey: `${run}-old`,
        createdAt: new Date(now.getTime() - (LIMITS.oldestPendingSec + 60) * 1000),
      },
    });
    r = await deepHealth(now);
    expect(r.status).toBe("down");
    expect(r.checks.outboxPending).toBe(base.outboxPending + 1);
    expect(r.checks.outboxOldestPendingSec).toBeGreaterThan(LIMITS.oldestPendingSec);
    expect(r.problems.join(" ")).toMatch(/kuyruğu/);
  });

  it("uç yetkisiz istekte ayrıntı vermez; yetkili istekte rapor döner", async () => {
    process.env.HEALTH_TOKEN = "izleme-anahtari-1234567890";
    expect((await GET(new Request("http://x/api/health/deep"))).status).toBe(401);
    expect(
      (
        await GET(
          new Request("http://x/api/health/deep", { headers: { authorization: "Bearer yanlis" } }),
        )
      ).status,
    ).toBe(401);
    const res = await GET(
      new Request("http://x/api/health/deep", {
        headers: { authorization: "Bearer izleme-anahtari-1234567890" },
      }),
    );
    expect([200, 503]).toContain(res.status);
    expect(await res.json()).toHaveProperty("checks.database", true);
    delete process.env.HEALTH_TOKEN;
  });
});
