import { encryptField } from "@avrupadasat/db/crypto";
import { afterAll, describe, expect, it } from "vitest";
import { DELETE as meDELETE } from "@/app/api/v1/me/route";
import { DELETE_ERRORS, deleteOwnAccount, deletedEmail } from "./account";
import { login } from "./auth";
import { db } from "./db";
import { hashPassword } from "./password";
import { randomToken, sha256 } from "./tokens";
import { generateSecret, totp } from "./totp";

const run = `del${Date.now()}`;
const PW = "Guclu-Parola-2026!";
const tenants: string[] = [];
const users: string[] = [];
const future = () => new Date(Date.now() + 3600_000);

async function tenant(name: string) {
  const t = await db().tenant.create({ data: { name, slug: `${run}-${name}`, status: "ACTIVE" } });
  tenants.push(t.id);
  return t.id;
}

async function user(key: string, opts: { staff?: boolean; secret?: string } = {}) {
  const u = await db().user.create({
    data: {
      email: `${run}-${key}@firma.example.com`,
      name: `Kişi ${key}`,
      passwordHash: await hashPassword(PW),
      staffRole: opts.staff ? "OPS" : null,
      twoFactorSecretEnc: opts.secret ? encryptField(opts.secret) : null,
      twoFactorEnabledAt: opts.secret ? new Date() : null,
    },
  });
  users.push(u.id);
  return u.id;
}

async function withSessions(userId: string) {
  await db().session.create({
    data: { tokenHash: sha256(randomToken()), userId, expiresAt: future() },
  });
  const api = `as_${randomToken()}`;
  await db().apiToken.create({
    data: {
      tokenHash: sha256(api),
      userId,
      name: "iPhone",
      expiresAt: future(),
      pushToken: `ExponentPushToken[${userId}]`,
    },
  });
  await db().authToken.create({
    data: {
      tokenHash: sha256(randomToken()),
      userId,
      purpose: "PASSWORD_RESET",
      expiresAt: future(),
    },
  });
  return api;
}

describe.skipIf(!process.env.DATABASE_URL)("hesap silme", () => {
  afterAll(async () => {
    await db().outboxEvent.deleteMany({ where: { tenantId: { in: tenants } } });
    await db().auditLog.deleteMany({ where: { actorUserId: { in: users } } });
    await db().membership.deleteMany({ where: { userId: { in: users } } });
    await db().user.deleteMany({ where: { id: { in: users } } });
    await db().tenant.deleteMany({ where: { id: { in: tenants } } });
  });

  it("onay, parola ve ekip hesabı kuralları; hata durumunda hiçbir şey değişmez", async () => {
    const T = await tenant("a");
    const u = await user("a");
    await db().membership.create({ data: { tenantId: T, userId: u, role: "CLIENT_OWNER" } });
    await withSessions(u);
    expect(await deleteOwnAccount(u, { password: PW, confirm: false }, null)).toEqual({
      ok: false,
      reason: DELETE_ERRORS.confirm,
    });
    expect(await deleteOwnAccount(u, { password: "yanlis", confirm: true }, null)).toEqual({
      ok: false,
      reason: DELETE_ERRORS.creds,
    });
    expect(await db().session.count({ where: { userId: u } })).toBe(1);
    expect((await db().user.findUniqueOrThrow({ where: { id: u } })).disabledAt).toBeNull();
    const staff = await user("staff", { staff: true });
    expect(await deleteOwnAccount(staff, { password: PW, confirm: true }, null)).toEqual({
      ok: false,
      reason: DELETE_ERRORS.staff,
    });
  });

  it("son sahip silinince veriler anonimleşir, oturumlar/anahtarlar/üyelik silinir, ekibe olay gider; giriş artık olmaz", async () => {
    const T = await tenant("b");
    const owner = await user("b-owner");
    const member = await user("b-member");
    await db().membership.createMany({
      data: [
        { tenantId: T, userId: owner, role: "CLIENT_OWNER" },
        { tenantId: T, userId: member, role: "CLIENT_USER" },
      ],
    });
    await withSessions(owner);
    const email = `${run}-b-owner@firma.example.com`;
    const r = await deleteOwnAccount(owner, { password: PW, confirm: true }, "203.0.113.5");
    expect(r).toEqual({ ok: true, ownerlessTenants: [T] });
    const u = await db().user.findUniqueOrThrow({ where: { id: owner } });
    expect(u).toMatchObject({
      email: deletedEmail(owner),
      name: "Silinmiş kullanıcı",
      passwordHash: null,
      twoFactorSecretEnc: null,
    });
    expect(u.disabledAt).not.toBeNull();
    expect(await db().session.count({ where: { userId: owner } })).toBe(0);
    expect(await db().apiToken.count({ where: { userId: owner } })).toBe(0);
    expect(await db().authToken.count({ where: { userId: owner } })).toBe(0);
    expect(await db().membership.count({ where: { userId: owner } })).toBe(0);
    expect(await db().membership.count({ where: { userId: member } })).toBe(1); // diğer kullanıcılar etkilenmez
    const ev = await db().outboxEvent.findMany({
      where: { tenantId: T, type: "account.deletion_requested.v1" },
    });
    expect(ev).toHaveLength(1);
    expect(JSON.stringify(ev[0]!.payload)).not.toContain(run); // olayda kişisel veri yok
    const audits = await db().auditLog.findMany({
      where: { actorUserId: owner, action: "user.deleted" },
    });
    expect(audits).toHaveLength(1);
    expect((await login(email, PW, "203.0.113.5")).ok).toBe(false);
    expect((await login(deletedEmail(owner), PW, "203.0.113.5")).ok).toBe(false);
  });

  it("başka sahip varsa olay üretilmez; 2FA açıksa kod gerekir; mobil API ile silinir", async () => {
    const T = await tenant("c");
    const secret = generateSecret();
    const a = await user("c-a", { secret });
    const b = await user("c-b");
    await db().membership.createMany({
      data: [
        { tenantId: T, userId: a, role: "CLIENT_OWNER" },
        { tenantId: T, userId: b, role: "CLIENT_OWNER" },
      ],
    });
    const api = await withSessions(a);
    const del = (body: unknown, token = api) =>
      meDELETE(
        new Request("http://x/api/v1/me", {
          method: "DELETE",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
    expect((await del({ password: PW, confirm: true }, "gecersiz")).status).toBe(401);
    const noCode = await del({ password: PW, confirm: true });
    expect(noCode.status).toBe(400);
    expect(await noCode.json()).toEqual({ error: DELETE_ERRORS.creds });
    expect((await del({ password: PW, confirm: true, code: totp(secret) })).status).toBe(204);
    expect(await db().outboxEvent.count({ where: { tenantId: T } })).toBe(0);
    expect(await db().apiToken.count({ where: { userId: a } })).toBe(0);
    // Aynı anahtar artık geçersiz
    expect((await del({ password: PW, confirm: true })).status).toBe(401);
  });
});
