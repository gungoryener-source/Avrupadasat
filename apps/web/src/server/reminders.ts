/**
 * Hatırlatmalar (cron: /api/cron/hatirlatmalar). Her kayıt için bir kez bildirim üretir
 * (remindedAt alanı); belgelerde son 30 gün içinde aynı başlıkla tekrar gönderilmez.
 */
import { db } from "./db";
import { notifyTenant, notifyUsers } from "./notifications";
import { TAX_KIND_LABEL } from "./company";

const DAY = 86400_000;

export async function runReminders(now = new Date()) {
  let sent = 0;

  // Görevler: 2 gün içinde son tarihi gelen, tamamlanmamış
  const tasks = await db().task.findMany({
    where: {
      status: { not: "COMPLETED" },
      dueAt: { lte: new Date(+now + 2 * DAY) },
      remindedAt: null,
    },
    take: 500,
  });
  for (const t of tasks) {
    if (t.assigneeId)
      await notifyUsers([t.assigneeId], {
        type: "deadline",
        tenantId: t.tenantId,
        title: `Son tarih yaklaşıyor: ${t.title}`,
        href: `/admin/gorevler?id=${t.id}`,
      });
    if (t.customerVisible && t.customerAction)
      await notifyTenant(t.tenantId, {
        type: "deadline",
        title: `Son tarih yaklaşıyor: ${t.title}`,
        href: "/panel/gorevler",
        email: true,
      });
    await db().task.update({ where: { id: t.id }, data: { remindedAt: now } });
    sent++;
  }

  // Vergi takvimi: 5 gün içinde
  const filings = await db().taxFiling.findMany({
    where: {
      status: { not: "COMPLETED" },
      dueAt: { lte: new Date(+now + 5 * DAY) },
      remindedAt: null,
    },
    take: 500,
  });
  for (const f of filings) {
    await notifyTenant(f.tenantId, {
      type: "deadline",
      title: `${TAX_KIND_LABEL[f.kind] ?? f.kind} ${f.period}: son tarih ${f.dueAt.toLocaleDateString("tr-TR")}`,
      href: "/panel/vergi",
      email: true,
    });
    await db().taxFiling.update({ where: { id: f.id }, data: { remindedAt: now } });
    sent++;
  }

  // Belgeler: 30 gün içinde süresi dolan, onaylı
  const docs = await db().document.findMany({
    where: { review: "APPROVED", expiresAt: { gte: now, lte: new Date(+now + 30 * DAY) } },
    take: 500,
  });
  for (const d of docs) {
    const title = `Belgenin süresi doluyor: ${d.filename}`;
    const dup = await db().notification.findFirst({
      where: { tenantId: d.tenantId, title, createdAt: { gte: new Date(+now - 30 * DAY) } },
    });
    if (dup) continue;
    await notifyTenant(d.tenantId, {
      type: "document",
      title,
      href: "/panel/belgeler",
      email: true,
    });
    sent++;
  }

  // Düşük stok
  const low = await db().$queryRaw<{ id: string; tenantId: string; sku: string; name: string }[]>`
    SELECT id, "tenantId", sku, name FROM "StockItem"
    WHERE "lowStockAt" IS NOT NULL AND quantity - reserved <= "lowStockAt"`;
  for (const s of low) {
    const title = `Düşük stok: ${s.sku} ${s.name}`;
    const dup = await db().notification.findFirst({
      where: { tenantId: s.tenantId, title, createdAt: { gte: new Date(+now - 7 * DAY) } },
    });
    if (dup) continue;
    await notifyTenant(s.tenantId, { type: "stock", title, href: "/panel/stok" });
    sent++;
  }
  return { sent };
}
