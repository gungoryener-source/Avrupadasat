import type { Actor } from "@avrupadasat/core/roles";

export interface TabCtx {
  tenantId: string;
  actor: Actor;
  userId: string;
  q: Record<string, string | undefined>;
}
