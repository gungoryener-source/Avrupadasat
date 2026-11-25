/**
 * Outbox işleyici. Birden fazla worker aynı anda çalışabilir (FOR UPDATE SKIP LOCKED).
 * Aşama 0: bildirimler mock modunda yalnız loglanır.
 */
import "dotenv/config";
import { decryptField, getPrisma } from "@avrupadasat/db";
import { processRow, type OutboxRow, type Ports } from "./handlers";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 2000);
const BATCH = 20;

const isProd = process.env.NODE_ENV === "production";

const mockPorts: Ports = {
  appUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  decrypt: (t) => decryptField(t),
  async notify(channel, subject, body) {
    console.info(`[mock:${channel}] ${subject}`, body);
  },
  async sendLinkEmail(to, subject, link) {
    // Mock: geliştirmede bağlantı konsola yazılır; üretimde ASLA loglanmaz
    const masked = to.replace(/^(.).*(@.*)$/, "$1***$2");
    console.info(`[mock:email] ${subject} → ${isProd ? masked : to}${isProd ? "" : ` | ${link}`}`);
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
      const outcome = await processRow(row, mockPorts);
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

let stopping = false;
process.on("SIGTERM", () => (stopping = true));
process.on("SIGINT", () => (stopping = true));

console.info(`Worker başladı (her ${POLL_MS} ms)`);
while (!stopping) {
  try {
    const n = await tick();
    if (n === 0) await new Promise((r) => setTimeout(r, POLL_MS));
  } catch (e) {
    console.error("Worker hatası", e instanceof Error ? e.message : e);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}
await getPrisma().$disconnect();
