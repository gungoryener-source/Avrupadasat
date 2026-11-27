import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@avrupadasat/core/roles";
import { updateCompany, getCompany, upsertFiling, nextMonthlyVatDeadlines } from "./company";
import { db } from "./db";
import { listNotifications, markRead, unreadCount } from "./notifications";
import { runReminders } from "./reminders";
import { createTask, customerMarkDone, listCustomerTasks, updateTask } from "./tasks";
import { createTicket, getTicket, listTenantTickets, replyTicket, updateTicket } from "./tickets";

const run = Date.now().toString(36);
let A: string, B: string;
let admin: Actor, support: Actor, sales: Actor, ownerA: Actor, ownerB: Actor;

async function user(email: string, staffRole?: "ADMIN" | "SUPPORT" | "SALES") {
  return db().user.create({
    data: { email, name: email.split("@")[0]!, staffRole: staffRole ?? null },
  });
}

beforeAll(async () => {
  A = (await db().tenant.create({ data: { name: `Portal A ${run}`, slug: `portal-a-${run}` } })).id;
  B = (await db().tenant.create({ data: { name: `Portal B ${run}`, slug: `portal-b-${run}` } })).id;
  const a = await user(`adm-${run}@t.local`, "ADMIN");
  const s = await user(`sup-${run}@t.local`, "SUPPORT");
  const sa = await user(`sal-${run}@t.local`, "SALES");
  const oa = await user(`oa-${run}@t.local`);
  const ob = await user(`ob-${run}@t.local`);
  await db().membership.create({ data: { tenantId: A, userId: oa.id, role: "CLIENT_OWNER" } });
  await db().membership.create({ data: { tenantId: B, userId: ob.id, role: "CLIENT_OWNER" } });
  admin = { userId: a.id, role: "ADMIN", tenantId: null };
  support = { userId: s.id, role: "SUPPORT", tenantId: null };
  sales = { userId: sa.id, role: "SALES", tenantId: null };
  ownerA = { userId: oa.id, role: "CLIENT_OWNER", tenantId: A };
  ownerB = { userId: ob.id, role: "CLIENT_OWNER", tenantId: B };
});

afterAll(async () => {
  await db().tenant.deleteMany({ where: { id: { in: [A, B] } } });
});

describe("destek talepleri", () => {
  let ticketId = "";
  it("müşteri talep açar; ekip bildirim alır; doğrulama hataları alan bazında", async () => {
    const bad = await createTicket(ownerA, A, { subject: "x", category: "GENEL", body: "kısa" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.fieldErrors ?? {})).toEqual(["subject", "body"]);
    const r = await createTicket(ownerA, A, {
      subject: "Vergi numarası ne zaman gelir?",
      category: "VERGI",
      body: "Başvurumuzun durumunu öğrenebilir miyiz?",
    });
    expect(r.ok).toBe(true);
    if (r.ok) ticketId = r.id;
    expect(await unreadCount(support.userId)).toBeGreaterThan(0);
  });

  it("başka firmanın müşterisi talebi göremez ve yanıtlayamaz", async () => {
    expect(await getTicket(ownerB, ticketId)).toBeNull();
    expect((await replyTicket(ownerB, ticketId, { body: "merhaba" })).ok).toBe(false);
    expect(
      await createTicket(ownerB, A, {
        subject: "Sızma denemesi",
        category: "GENEL",
        body: "başka firma adına talep",
      }),
    ).toMatchObject({ ok: false });
    expect((await listTenantTickets(B)).total).toBe(0);
  });

  it("iç not müşteriye sorgu düzeyinde gizli; müşteri iç not yazamaz", async () => {
    await replyTicket(support, ticketId, {
      body: "Finanzamt'ı arayacağım (iç not)",
      internal: true,
    });
    await replyTicket(support, ticketId, { body: "Başvurunuz işlemde, haftaya dönüş bekliyoruz." });
    await replyTicket(ownerA, ticketId, { body: "Müşteri iç not denemesi", internal: true });
    const asCustomer = await getTicket(ownerA, ticketId);
    const asStaff = await getTicket(support, ticketId);
    expect(asCustomer!.messages.some((m) => m.internal)).toBe(false);
    expect(asCustomer!.messages.map((m) => m.body)).not.toContain(
      "Finanzamt'ı arayacağım (iç not)",
    );
    expect(asStaff!.messages.filter((m) => m.internal)).toHaveLength(1);
    expect(asCustomer!.assigneeId).toBe(support.userId);
    expect(asCustomer!.status).toBe("WAITING_TEAM");
  });

  it("durumu yalnız ekip değiştirir; çözülünce müşteri bildirim alır", async () => {
    expect((await updateTicket(ownerA, ticketId, { status: "CLOSED" })).ok).toBe(false);
    const before = await unreadCount(ownerA.userId);
    expect((await updateTicket(support, ticketId, { status: "RESOLVED" })).ok).toBe(true);
    expect(await unreadCount(ownerA.userId)).toBe(before + 1);
  });
});

describe("görevler", () => {
  let taskId = "";
  it("yalnız task.write rolü görev açar; müşteri görünümünde iç not yok", async () => {
    expect((await createTask(sales, A, { title: "Satış görevi" })).ok).toBe(false);
    const r = await createTask(admin, A, {
      title: "Vekâletname yükleyin",
      customerAction: true,
      customerUpdate: "Apostilli vekâletnameyi Belgelerim'e yükleyin",
      internalNote: "Noter randevusu 3 Aralık",
      assigneeId: support.userId,
      dueAt: new Date(Date.now() + 86400_000).toISOString(),
    });
    expect(r.ok).toBe(true);
    if (r.ok) taskId = r.id;
    await createTask(admin, A, { title: "İç kontrol", customerVisible: false });
    const list = await listCustomerTasks(A);
    expect(list.map((t) => t.title)).toEqual(["Vekâletname yükleyin"]);
    expect(JSON.stringify(list)).not.toContain("Noter randevusu");
    expect(await listCustomerTasks(B)).toHaveLength(0);
  });

  it("müşteri 'yaptım' der; başka firma diyemez; atanan kişi bildirim alır", async () => {
    expect((await customerMarkDone(ownerB, taskId, undefined)).ok).toBe(false);
    const before = await unreadCount(support.userId);
    expect((await customerMarkDone(ownerA, taskId, "Yükledim")).ok).toBe(true);
    expect(await unreadCount(support.userId)).toBe(before + 1);
    const t = await db().task.findUniqueOrThrow({ where: { id: taskId } });
    expect(t.status).toBe("IN_PROGRESS");
    expect(t.internalNote).toContain("Müşteri notu: Yükledim");
  });

  it("durum değişince müşteriye bildirim ve e-posta olayı", async () => {
    const before = await db().outboxEvent.count({ where: { type: "notification.email.v1" } });
    expect((await updateTask(admin, taskId, { status: "COMPLETED" })).ok).toBe(true);
    expect(
      await db().outboxEvent.count({ where: { type: "notification.email.v1" } }),
    ).toBeGreaterThan(before);
    const t = await db().task.findUniqueOrThrow({ where: { id: taskId } });
    expect(t.completedAt).not.toBeNull();
  });
});

describe("bildirimler", () => {
  it("kullanıcı yalnız kendi bildirimini okundu yapabilir", async () => {
    const { items } = await listNotifications(ownerA.userId);
    expect(items.length).toBeGreaterThan(0);
    expect(await markRead(ownerB.userId, items[0]!.id)).toBe(0);
    expect(await markRead(ownerA.userId, items[0]!.id)).toBe(1);
    await markRead(ownerA.userId);
    expect(await unreadCount(ownerA.userId)).toBe(0);
  });
});

describe("şirket profili ve vergi takvimi", () => {
  it("yalnız tenant.manage günceller; USt-IdNr. biçimi doğrulanır; vergi no şifreli ve maskeli", async () => {
    expect((await updateCompany(ownerA, A, { legalName: "X" })).ok).toBe(false);
    const bad = await updateCompany(admin, A, { vatId: "DE12" });
    expect(bad.ok).toBe(false);
    const ok = await updateCompany(admin, A, {
      legalName: "Yıldız Tekstil UG (haftungsbeschränkt)",
      companyForm: "UG",
      vatId: "de 123 456 789",
      taxNumber: "045/123/45678",
      representatives: [{ name: "Zeynep Demir", role: "Geschäftsführerin" }],
    });
    expect(ok.ok).toBe(true);
    const raw = await db().tenant.findUniqueOrThrow({ where: { id: A } });
    expect(raw.taxNumberEnc).not.toContain("045/123");
    const c = await getCompany(A);
    expect(c.vatId).toBe("DE123456789");
    expect(c.taxNumber).not.toBe("045/123/45678");
    expect(c.representatives[0]!.name).toBe("Zeynep Demir");
  });

  it("vergi beyanı: müşteri yazamaz; durum değişince bildirim; hatırlatma bir kez", async () => {
    expect(
      (await upsertFiling(ownerA, A, { kind: "UST_VA", period: "2026-11", dueAt: new Date() })).ok,
    ).toBe(false);
    const due = new Date(Date.now() + 2 * 86400_000);
    expect(
      (await upsertFiling(admin, A, { kind: "UST_VA", period: "2026-11", dueAt: due })).ok,
    ).toBe(true);
    const r1 = await runReminders();
    const r2 = await runReminders();
    expect(r1.sent).toBeGreaterThan(0);
    expect(r2.sent).toBe(0);
  });

  it("aylık KDV ön beyanı son tarihi ertesi ayın 10'u", () => {
    const d = nextMonthlyVatDeadlines(new Date(Date.UTC(2026, 10, 15)), 2);
    expect(d[0]).toMatchObject({ period: "2026-11" });
    expect(d[0]!.dueAt.toISOString().slice(0, 10)).toBe("2026-12-10");
    expect(d[1]!.dueAt.toISOString().slice(0, 10)).toBe("2027-01-10");
  });
});
