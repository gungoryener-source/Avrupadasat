import { decryptField } from "@avrupadasat/db/crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  confirmTwoFactorSetup,
  issueToken,
  login,
  MAX_FAILED,
  passTwoFactor,
  readSession,
  requestPasswordReset,
  setPasswordWithToken,
  startTwoFactorSetup,
  tokenIsValid,
} from "./auth";
import { db } from "./db";
import { hashPassword } from "./password";
import { totp } from "./totp";

const run = `auth${Date.now()}`;
const email = `${run}@test.local`;
const PW = "Guvenli sifre 2026";
let userId: string;
let ip = 0;
const nextIp = () => `10.${run.length}.${Math.floor(ip / 250)}.${ip++ % 250}`;

describe.skipIf(!process.env.DATABASE_URL)("kimlik doğrulama", () => {
  beforeAll(async () => {
    userId = (
      await db().user.create({
        data: { email, name: "Test Ops", staffRole: "OPS", passwordHash: await hashPassword(PW) },
      })
    ).id;
  });
  afterAll(async () => {
    await db().user.deleteMany({ where: { email: { startsWith: run } } });
    await db().outboxEvent.deleteMany({
      where: { payload: { path: ["email"], string_starts_with: run } },
    });
  });

  it("yanlış şifreyle giriş yapılamaz; e-posta büyük harf duyarsız", async () => {
    expect(await login(email, "yanlis", nextIp())).toEqual({ ok: false, reason: "invalid" });
    const r = await login(email.toUpperCase(), PW, nextIp());
    expect(r.ok).toBe(true);
  });

  it("ekip kullanıcısı 2FA kurmaya yönlendirilir", async () => {
    const r = await login(email, PW, nextIp());
    expect(r).toMatchObject({ ok: true, needsTwoFactor: false, needsTwoFactorSetup: true });
    if (!r.ok) return;
    const s = await readSession(r.token);
    expect(s?.actor).toMatchObject({ role: "OPS", tenantId: null });
    expect(s?.twoFactorEnabled).toBe(false);
  });

  it("2FA kurulur; sonraki girişte kod istenir ve oturum token'ı yenilenir", async () => {
    const first = await login(email, PW, nextIp());
    if (!first.ok) throw new Error("giriş");
    const s = (await readSession(first.token))!;
    const secret = await startTwoFactorSetup(userId);
    expect(await confirmTwoFactorSetup(userId, s.sessionId, "000000", null)).toBe(false);
    expect(await confirmTwoFactorSetup(userId, s.sessionId, totp(secret), null)).toBe(true);

    const r = await login(email, PW, nextIp());
    expect(r).toMatchObject({ ok: true, needsTwoFactor: true });
    if (!r.ok) return;
    expect((await readSession(r.token))?.twoFactorPassed).toBe(false);
    expect(await passTwoFactor(r.token, "111111", null)).toBeNull();
    const u = await db().user.findUniqueOrThrow({ where: { id: userId } });
    // Kurulumda kullanılan kod tekrar kabul edilmez; bir sonraki zaman adımının kodu kullanılır
    const fresh = await passTwoFactor(
      r.token,
      totp(decryptField(u.twoFactorSecretEnc!), Date.now() + 30_000),
      null,
    );
    expect(fresh).toBeTruthy();
    expect(await readSession(r.token)).toBeNull();
    expect((await readSession(fresh))?.twoFactorPassed).toBe(true);
  });

  it("aynı 2FA kodu ikinci kez kullanılamaz (tekrar oynatma koruması)", async () => {
    const u = await db().user.findUniqueOrThrow({ where: { id: userId } });
    const secret = decryptField(u.twoFactorSecretEnc!);
    await db().user.update({ where: { id: userId }, data: { lastTotpStep: null } });
    const code = totp(secret);
    const a = await login(email, PW, nextIp());
    const b = await login(email, PW, nextIp());
    if (!a.ok || !b.ok) throw new Error("giriş");
    expect(await passTwoFactor(a.token, code, null)).toBeTruthy();
    expect(await passTwoFactor(b.token, code, null)).toBeNull();
  });

  it(`${MAX_FAILED} hatalı denemeden sonra hesap kilitlenir; doğru şifre de reddedilir`, async () => {
    for (let i = 0; i < MAX_FAILED; i++) await login(email, `yanlis${i}`, nextIp());
    expect(await login(email, PW, nextIp())).toEqual({ ok: false, reason: "locked" });
    await db().user.update({ where: { id: userId }, data: { lockedUntil: null } });
  });

  it("aynı IP'den çok deneme hız sınırına takılır", async () => {
    const fixed = `172.16.${run.length}.9`;
    let last;
    for (let i = 0; i < 21; i++) last = await login(`yok-${i}@x.y`, "x", fixed);
    expect(last).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("davet token'ı ile şifre belirlenir, token tek kullanımlık, eski oturumlar kapanır", async () => {
    const r = await login(email, PW, nextIp());
    if (!r.ok) throw new Error("giriş");
    const token = await issueToken(userId, "INVITE");
    expect(await tokenIsValid(token)).toBe(true);
    expect(await setPasswordWithToken(token, "kisa", null)).toMatchObject({ ok: false });
    expect(await setPasswordWithToken(token, "Yeni guclu sifre 99", null)).toEqual({ ok: true });
    expect(await setPasswordWithToken(token, "Yeni guclu sifre 98", null)).toMatchObject({
      ok: false,
    });
    expect(await readSession(r.token)).toBeNull();
    expect((await login(email, "Yeni guclu sifre 99", nextIp())).ok).toBe(true);
  });

  it("ham token outbox'a yazılmaz", async () => {
    const token = await issueToken(userId, "PASSWORD_RESET");
    const ev = await db().outboxEvent.findFirstOrThrow({
      where: { type: "user.invited.v1" },
      orderBy: { createdAt: "desc" },
    });
    expect(JSON.stringify(ev.payload)).not.toContain(token);
    expect(decryptField((ev.payload as { tokenEnc: string }).tokenEnc)).toBe(token);
  });

  it("olmayan e-posta için sıfırlama isteği sessizce yanıtlanır", async () => {
    await expect(requestPasswordReset("olmayan@x.y", nextIp())).resolves.toBeUndefined();
  });
});
