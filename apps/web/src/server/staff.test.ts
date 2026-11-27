import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "@avrupadasat/core/roles";
import { db } from "./db";
import { reviewDocument, uploadDocument } from "./documents";
import { listNotifications } from "./notifications";
import { changePackage, changeStaffRole, inviteStaff, setStaffDisabled } from "./staff";

const run = `st${Date.now().toString(36)}`;
let T: string;
let admin: Actor, ops: Actor, finance: Actor, owner: Actor;
const emails: string[] = [];

async function user(email: string, staffRole?: "ADMIN" | "OPS" | "FINANCE") {
  emails.push(email);
  return db().user.create({ data: { email, name: email.split("@")[0]!, staffRole } });
}

beforeAll(async () => {
  T = (await db().tenant.create({ data: { name: `Staff T ${run}`, slug: `staff-t-${run}` } })).id;
  const a = await user(`adm-${run}@t.local`, "ADMIN");
  const o = await user(`ops-${run}@t.local`, "OPS");
  const f = await user(`fin-${run}@t.local`, "FINANCE");
  const c = await user(`own-${run}@t.local`);
  await db().membership.create({ data: { tenantId: T, userId: c.id, role: "CLIENT_OWNER" } });
  admin = { userId: a.id, role: "ADMIN", tenantId: null };
  ops = { userId: o.id, role: "OPS", tenantId: null };
  finance = { userId: f.id, role: "FINANCE", tenantId: null };
  owner = { userId: c.id, role: "CLIENT_OWNER", tenantId: T };
});

afterAll(async () => {
  await db().tenant.deleteMany({ where: { id: T } });
  await db().user.deleteMany({ where: { email: { in: emails } } });
});

describe("personel ve yetkiler", () => {
  it("yalnız staff.manage yetkisi olan personel yönetir", async () => {
    expect((await changeStaffRole(ops, finance.userId, "ADMIN")).ok).toBe(false);
    expect(
      (await inviteStaff(owner, { name: "X Y", email: `x-${run}@t.local`, role: "OPS" })).ok,
    ).toBe(false);
  });

  it("kendi rolünü değiştiremez, kendini kapatamaz", async () => {
    expect(await changeStaffRole(admin, admin.userId, "SUPPORT")).toMatchObject({ ok: false });
    expect(await setStaffDisabled(admin, admin.userId, true)).toMatchObject({ ok: false });
  });

  it("rol değişince oturumlar kapanır ve denetim kaydı düşer", async () => {
    await db().session.create({
      data: {
        userId: ops.userId,
        tokenHash: `h-${run}`,
        expiresAt: new Date(Date.now() + 3600_000),
      } as never,
    });
    expect((await changeStaffRole(admin, ops.userId, "SUPPORT")).ok).toBe(true);
    expect((await db().user.findUnique({ where: { id: ops.userId } }))?.staffRole).toBe("SUPPORT");
    expect(await db().session.count({ where: { userId: ops.userId } })).toBe(0);
    expect(
      await db().auditLog.count({ where: { action: "role.changed", entityId: ops.userId } }),
    ).toBeGreaterThan(0);
  });

  it("müşteri hesabına bağlı e-posta ekip üyesi yapılamaz", async () => {
    const r = await inviteStaff(admin, { name: "Own", email: `own-${run}@t.local`, role: "OPS" });
    expect(r).toMatchObject({ ok: false });
  });

  it("yeni ekip üyesi davet edilir", async () => {
    const email = `new-${run}@t.local`;
    emails.push(email);
    expect((await inviteStaff(admin, { name: "Yeni Kişi", email, role: "SUPPORT" })).ok).toBe(true);
    const u = await db().user.findUnique({ where: { email } });
    expect(u?.staffRole).toBe("SUPPORT");
    expect(await db().authToken.count({ where: { userId: u!.id, purpose: "INVITE" } })).toBe(1);
  });
});

describe("abonelik paketi", () => {
  it("yalnız subscription.manage değiştirir; müşteri bildirim alır; ödeme alınmaz", async () => {
    expect((await changePackage(ops, T, "OPERASYON", "")).ok).toBe(false);
    expect((await changePackage(finance, T, "GECERSIZ", "")).ok).toBe(false);
    expect((await changePackage(finance, T, "OPERASYON", "talep #1")).ok).toBe(true);
    expect((await db().tenant.findUnique({ where: { id: T } }))?.packageCode).toBe("OPERASYON");
    const n = await listNotifications(owner.userId, { take: 5, skip: 0 });
    expect(n.items.some((x) => x.type === "subscription")).toBe(true);
    expect(await db().invoice.count({ where: { tenantId: T } })).toBe(0);
  });
});

describe("belge onayı", () => {
  it("ret nedeni zorunlu; onay müşteriye bildirilir", async () => {
    const pdf = Buffer.from("%PDF-1.4\n%test\n");
    const up = await uploadDocument({
      tenantId: T,
      kind: "SIRKET",
      filename: "sicil.pdf",
      data: pdf,
      actorUserId: owner.userId,
    });
    expect(up.ok).toBe(true);
    if (!up.ok) return;
    expect((await db().document.findUnique({ where: { id: up.id } }))?.review).toBe("PENDING");
    expect(
      (await reviewDocument({ actorUserId: admin.userId, id: up.id, decision: "REJECTED" })).ok,
    ).toBe(false);
    expect(
      (await reviewDocument({ actorUserId: admin.userId, id: up.id, decision: "APPROVED" })).ok,
    ).toBe(true);
    const n = await listNotifications(owner.userId, { take: 10, skip: 0 });
    expect(n.items.some((x) => x.title.includes("onaylandı"))).toBe(true);
  });
});
