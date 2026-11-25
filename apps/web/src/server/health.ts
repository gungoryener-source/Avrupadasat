/**
 * İzleme için derin sağlık kontrolü (yalnız korumalı uçtan; içerik operasyonel, kişisel veri yok).
 * - Veritabanı erişimi
 * - Outbox: bekleyen olay sayısı, en eski bekleyenin yaşı, kalıcı başarısız (dead) olaylar
 * - Worker nabzı (SystemHeartbeat "worker")
 */
import { db } from "./db";

export const LIMITS = { workerStaleSec: 120, oldestPendingSec: 900 } as const;

export interface HealthReport {
  status: "ok" | "warn" | "down";
  checks: {
    database: boolean;
    workerLastSeenSec: number | null;
    outboxPending: number;
    outboxOldestPendingSec: number | null;
    outboxDead: number;
  };
  problems: string[];
}

export async function deepHealth(now = new Date()): Promise<HealthReport> {
  try {
    await db().$queryRaw`SELECT 1`;
  } catch {
    return {
      status: "down",
      checks: {
        database: false,
        workerLastSeenSec: null,
        outboxPending: 0,
        outboxOldestPendingSec: null,
        outboxDead: 0,
      },
      problems: ["Veritabanına erişilemiyor"],
    };
  }
  const [pending, oldest, dead, hb] = await Promise.all([
    db().outboxEvent.count({ where: { processedAt: null, attempts: { lt: 5 } } }),
    db().outboxEvent.findFirst({
      where: { processedAt: null, attempts: { lt: 5 } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    db().outboxEvent.count({ where: { processedAt: null, attempts: { gte: 5 } } }),
    db().systemHeartbeat.findUnique({ where: { name: "worker" } }),
  ]);
  const age = (d: Date) => Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  const checks = {
    database: true,
    workerLastSeenSec: hb ? age(hb.seenAt) : null,
    outboxPending: pending,
    outboxOldestPendingSec: oldest ? age(oldest.createdAt) : null,
    outboxDead: dead,
  };
  const down: string[] = [];
  const warn: string[] = [];
  if (checks.workerLastSeenSec === null || checks.workerLastSeenSec > LIMITS.workerStaleSec)
    down.push("Worker çalışmıyor (nabız yok veya eski)");
  if ((checks.outboxOldestPendingSec ?? 0) > LIMITS.oldestPendingSec)
    down.push("Olay kuyruğu birikiyor (15 dakikadan eski bekleyen olay)");
  if (dead > 0) warn.push(`${dead} olay kalıcı olarak başarısız — ekip incelemeli`);
  return {
    status: down.length ? "down" : warn.length ? "warn" : "ok",
    checks,
    problems: [...down, ...warn],
  };
}
