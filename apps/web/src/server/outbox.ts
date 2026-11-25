import { randomUUID } from "node:crypto";
import { parseEvent, type EventPayload, type EventType } from "@avrupadasat/core/events";
import type { Prisma } from "@avrupadasat/db";

/** Olayı, çağıran işlemin (transaction) içinde outbox'a yazar */
export async function emit<T extends EventType>(
  tx: Prisma.TransactionClient,
  type: T,
  payload: EventPayload<T>,
  opts: { tenantId?: string | null; idempotencyKey?: string } = {},
) {
  const parsed = parseEvent(type, payload);
  await tx.outboxEvent.create({
    data: {
      type,
      tenantId: opts.tenantId ?? null,
      payload: parsed as Prisma.InputJsonValue,
      idempotencyKey: opts.idempotencyKey ?? `${type}:${randomUUID()}`,
    },
  });
}
