import { afterAll, describe, expect, it } from "vitest";
import { db } from "./db";
import { submitLead } from "./leads";
import { quotePdf } from "./pdf";
import { acceptQuote, createQuote, linesOf, quoteByToken, sendQuote } from "./quotes";

const run = `crm${Date.now()}`;
const email = `${run}@firma.com.tr`;
let staffId: string;

describe.skipIf(!process.env.DATABASE_URL)("talep → teklif → onay → müşteri", () => {
  afterAll(async () => {
    const leads = await db().lead.findMany({ where: { email } });
    const tenantIds = leads.map((l) => l.tenantId).filter(Boolean) as string[];
    await db()
      .quote.deleteMany({ where: { leadId: { in: leads.map((l) => l.id) } } })
      .catch(() => undefined);
    await db().contract.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db().quote.deleteMany({ where: { leadId: { in: leads.map((l) => l.id) } } });
    await db().lead.deleteMany({ where: { email } });
    await db().tenant.deleteMany({ where: { id: { in: tenantIds } } });
    await db().user.deleteMany({ where: { email: { in: [email, `${run}-staff@x.y`] } } });
  });

  it("geçersiz form alan bazında hata döner", async () => {
    const r = await submitLead(
      { companyName: "A", email: "x", phone: "1", category: "?", consentKvkk: false },
      "1.1.1.1",
    );
    expect(r.ok).toBe(false);
    if (!r.ok && r.reason === "invalid") {
      expect(Object.keys(r.fieldErrors).sort()).toEqual([
        "category",
        "companyName",
        "consentKvkk",
        "email",
        "phone",
      ]);
    }
  });

  it("tam akış", async () => {
    staffId = (
      await db().user.create({
        data: { email: `${run}-staff@x.y`, name: "Satış", staffRole: "SALES" },
      })
    ).id;
    const ip = `192.0.2.${Date.now() % 200}`;
    const lead = await submitLead(
      {
        companyName: "Ege Zeytin Ltd. Şti.",
        email: email.toUpperCase(),
        phone: "+90 232 000 00 00",
        category: "gida",
        consentKvkk: true,
        attribution: { utmSource: "google", gclid: "abc" },
      },
      ip,
    );
    expect(lead.ok).toBe(true);
    if (!lead.ok) return;
    // Aynı gün tekrar gönderim ikinci olay üretmez
    await submitLead(
      {
        companyName: "Ege Zeytin",
        email,
        phone: "+90 232 000 00 00",
        category: "gida",
        consentKvkk: true,
      },
      ip,
    );
    const evs = await db().outboxEvent.count({
      where: { type: "lead.submitted.v1", payload: { path: ["email"], equals: email } },
    });
    expect(evs).toBe(1);

    const q = await createQuote({
      leadId: lead.leadId,
      packageCode: "PAZARA_GIRIS",
      companyForm: "UG",
      actorUserId: staffId,
    });
    expect(q.number).toMatch(/^AS-\d{4}-\d{4}$/);
    expect(q.oneTimeCents).toBe(87_500);
    expect(q.monthlyCents).toBe(49_900);

    const token = await sendQuote(q.id, staffId);
    expect((await quoteByToken(token))?.id).toBe(q.id);
    expect(await quoteByToken("yanlis")).toBeNull();

    expect(await acceptQuote(token, "x", "203.0.113.5")).toMatchObject({ ok: false });
    const acc = await acceptQuote(token, "Ayşe Yılmaz", "203.0.113.5");
    expect(acc.ok).toBe(true);
    if (!acc.ok) return;
    expect(await acceptQuote(token, "Ayşe Yılmaz", "203.0.113.5")).toMatchObject({ ok: false });

    const tenant = await db().tenant.findUniqueOrThrow({
      where: { id: acc.tenantId },
      include: {
        memberships: { include: { user: true } },
        registration: true,
        contracts: true,
        contacts: true,
      },
    });
    expect(tenant.slug).toMatch(/^ege-zeytin-ltd-sti/);
    expect(tenant.memberships[0]).toMatchObject({ role: "CLIENT_OWNER" });
    expect(tenant.memberships[0]!.user.email).toBe(email);
    expect(tenant.registration).toHaveLength(8);
    expect(tenant.contracts[0]).toMatchObject({
      signerName: "Ayşe Yılmaz",
      signerIp: "203.0.113.5",
    });
    expect(await db().lead.findUniqueOrThrow({ where: { id: lead.leadId } })).toMatchObject({
      status: "WON",
      tenantId: tenant.id,
    });
    expect(
      await db().authToken.count({
        where: { userId: tenant.memberships[0]!.userId, purpose: "INVITE" },
      }),
    ).toBe(1);

    const accepted = await db().quote.findUniqueOrThrow({
      where: { id: q.id },
      include: { lead: true },
    });
    const pdf = await quotePdf({
      number: accepted.number,
      companyName: accepted.lead!.companyName,
      email: accepted.lead!.email,
      createdAt: accepted.createdAt,
      validUntil: accepted.validUntil,
      packageName: "Pazara Giriş",
      lines: linesOf(accepted),
      oneTimeCents: accepted.oneTimeCents,
      monthlyCents: accepted.monthlyCents,
      priceListVersion: accepted.priceListVersion,
      acceptedAt: accepted.acceptedAt,
      acceptedByName: accepted.acceptedByName,
    });
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(5_000);
  });
});
