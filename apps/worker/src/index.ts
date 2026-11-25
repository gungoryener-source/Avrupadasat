/**
 * Outbox işleyici. Birden fazla worker aynı anda çalışabilir (FOR UPDATE SKIP LOCKED).
 * E-posta: SMTP_URL tanımlıysa gerçek gönderim, değilse mock (bkz. mailer.ts).
 */
import "dotenv/config";
import { decryptField, getPrisma } from "@avrupadasat/db";
import { processRow, type OutboxRow, type Ports } from "./handlers";
import { createMailer } from "./mailer";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 2000);
const BATCH = 20;

const ports: Ports = {
  appUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  decrypt: (t) => decryptField(t),
  sendMail: createMailer(),
  opsRecipients: (process.env.OPS_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  async tenantRecipients(tenantId) {
    const owners = await getPrisma().membership.findMany({
      where: { tenantId, role: "CLIENT_OWNER", user: { disabledAt: null } },
      select: { user: { select: { email: true } } },
    });
    return owners.map((o) => o.user.email);
  },
};

async function tick(): Promise<number> {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<OutboxRow[]>`
      SELECT id, type, "tenantId", payload, attempts FROM "OutboxEvent"
      WHERE "processedAt" IS NULL AND attempts < 5
      ORDER BY "createdAt" LIMIT ${BATCH}
      FOR UPDATE SKIP LOCKED`;
    for (const row of rows) {
      const outcome = await processRow(row, ports);
      await tx.outboxEvent.update({
        where: { id: row.id },
        data:
          outcome.kind === "done"
            ? { processedAt: new Date(), attempts: { increment: 1 }, lastError: null }
            : {
                attempts: outcome.kind === "dead" ? 5 : { increment: 1 },
                lastError: outcome.error,
              },
      });
    }
    return rows.length;
  });
}

/** Zamanlanmış işler: web uygulamasının korumalı cron uç noktasını çağırır */
const CRON = [
  { job: "sync", everyMs: 15 * 60_000 },
  { job: "snapshot", everyMs: 24 * 3600_000 },
] as const;
const lastRun = new Map<string, number>();

async function runCron() {
  const secret = process.env.CRON_SECRET;
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!secret || !base) return;
  for (const c of CRON) {
    const last = lastRun.get(c.job) ?? 0;
    if (Date.now() - last < c.everyMs) continue;
    lastRun.set(c.job, Date.now());
    try {
      const res = await fetch(`${base}/api/cron/${c.job}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(60_000),
      });
      console.info(`[cron] ${c.job} → ${res.status}`);
    } catch (e) {
      console.error(`[cron] ${c.job} hata`, e instanceof Error ? e.message : e);
    }
  }
}

let stopping = false;
process.on("SIGTERM", () => (stopping = true));
process.on("SIGINT", () => (stopping = true));

console.info(`Worker başladı (her ${POLL_MS} ms)`);
while (!stopping) {
  try {
    await runCron();
    const n = await tick();
    if (n === 0) await new Promise((r) => setTimeout(r, POLL_MS));
  } catch (e) {
    console.error("Worker hatası", e instanceof Error ? e.message : e);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}
await getPrisma().$disconnect();
