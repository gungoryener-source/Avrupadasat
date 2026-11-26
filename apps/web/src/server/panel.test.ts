import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { csvCell, parseCsv, toCsv } from "./csv";
import { db } from "./db";
import { uploadDocument } from "./documents";
import { detectType, sanitizeFilename, signDownload, verifyDownload } from "./files";
import { inviteMember, removeMember } from "./members";
import { EU_PARTY_REQUIRED, saveEuParty } from "./eu-party";
import { overview, registrationState, waitingList } from "./panel";
import {
  advanceStage,
  createAsn,
  importCatalog,
  parseAsnLines,
  receiveShipment,
} from "./shipments";

process.env.STORAGE_DIR = mkdtempSync(path.join(tmpdir(), "as-store-"));

describe("CSV", () => {
  it("noktalı virgül, tırnak, BOM ve CRLF", () => {
    expect(parseCsv('﻿sku;ad\r\nA-1;"Havlu; beyaz"\r\nB-2;"Çift ""tırnak"""\r\n')).toEqual([
      ["sku", "ad"],
      ["A-1", "Havlu; beyaz"],
      ["B-2", 'Çift "tırnak"'],
    ]);
  });
  it("dışa aktarımda formül enjeksiyonu engellenir", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(toCsv([["a", "-1"]])).toContain("'-1");
  });
  it("ASN satırları: başlıksız ve başlıklı, tekrarlar toplanır, hatalar raporlanır", () => {
    expect(parseAsnLines("H-1;10\nH-1;5\nH-2;3").lines).toEqual([
      { sku: "H-1", quantity: 15 },
      { sku: "H-2", quantity: 3 },
    ]);
    const r = parseAsnLines("sku;adet\nX;abc\nY;2");
    expect(r.lines).toEqual([{ sku: "Y", quantity: 2 }]);
    expect(r.errors).toHaveLength(1);
  });
});

describe("dosya güvenliği", () => {
  it("türü uzantıdan değil içerikten tespit eder", () => {
    expect(detectType(Buffer.from("%PDF-1.7 ..."))?.mime).toBe("application/pdf");
    expect(detectType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))?.ext).toBe("png");
    expect(detectType(Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]))).toBeNull(); // Windows EXE
    expect(detectType(Buffer.from("sku;ad\nA;B"))?.ext).toBe("csv");
  });
  it("dosya adını temizler, uzantıyı tespit edilen türden alır", () => {
    expect(sanitizeFilename("../../etc/passwd<script>.exe", "pdf")).toBe(
      ".._.._etc_passwd_script_.pdf",
    );
    expect(sanitizeFilename("Çeki listesi Kasım.xlsx", "xlsx")).toBe("Çeki listesi Kasım.xlsx");
  });
  it("imzalı indirme bağlantısı: süre, kullanıcı ve belgeye bağlı", () => {
    const now = 1_800_000_000_000;
    const url = new URL(signDownload("doc1", "u1", 300, now), "http://x");
    const e = url.searchParams.get("e");
    const s = url.searchParams.get("s");
    expect(verifyDownload("doc1", "u1", e, s, now)).toBe(true);
    expect(verifyDownload("doc1", "u2", e, s, now)).toBe(false);
    expect(verifyDownload("doc2", "u1", e, s, now)).toBe(false);
    expect(verifyDownload("doc1", "u1", e, s, now + 301_000)).toBe(false);
  });
});

const run = `p3${Date.now()}`;
let A: string;
let B: string;
let owner: string;

describe.skipIf(!process.env.DATABASE_URL)("müşteri paneli servisleri", () => {
  beforeAll(async () => {
    A = (await db().tenant.create({ data: { name: "A", slug: `${run}-a` } })).id;
    B = (await db().tenant.create({ data: { name: "B", slug: `${run}-b` } })).id;
    owner = (await db().user.create({ data: { email: `${run}-owner@ornek.test`, name: "Sahip" } }))
      .id;
    await db().membership.create({ data: { userId: owner, tenantId: A, role: "CLIENT_OWNER" } });
    await db().registrationTask.createMany({
      data: [
        { tenantId: A, step: "VERGI_NO", status: "SURUYOR" },
        { tenantId: A, step: "UST_ID", status: "BEKLIYOR" },
      ],
    });
    await saveEuParty(
      A,
      {
        importerModel: "OWN_DE_COMPANY",
        responsibleName: "Test GmbH",
        responsibleAddress: "Musterstraße 1, 10115 Berlin",
        responsibleEmail: "produkt@test.example.com",
      },
      owner,
    );
  });
  afterAll(async () => {
    await db().stockMovement.deleteMany({ where: { tenantId: { in: [A, B] } } });
    await db().tenant.deleteMany({ where: { id: { in: [A, B] } } });
    await db().user.deleteMany({ where: { email: { startsWith: run } } });
  });

  it("katalog içe aktarma: oluşturur, günceller, hatalı satırları raporlar", async () => {
    const r = await importCatalog(
      A,
      "sku;ad;ean\nHV-1;Havlu beyaz;8690000000011\nHV-2;Havlu gri;\n;Adsız;\nHV-3;;\nHV-4;Hatalı;12AB",
      owner,
    );
    expect(r).toMatchObject({ created: 2, updated: 0 });
    expect(r.errors).toHaveLength(3);
    const r2 = await importCatalog(A, "sku;ad\nHV-1;Havlu beyaz 50x90", owner);
    expect(r2).toMatchObject({ created: 0, updated: 1 });
  });

  it("AB sorumlu taraf girilmeden mal kabul bildirimi açılmaz", async () => {
    await expect(
      createAsn(
        B,
        { reference: `${run}-KAPI`, pallets: 1, cartons: 1, lines: [{ sku: "X", quantity: 1 }] },
        owner,
      ),
    ).rejects.toThrow(EU_PARTY_REQUIRED);
    process.env.EU_PARTY_GATE = "0";
    try {
      await expect(
        createAsn(
          B,
          { reference: `${run}-KAPI`, pallets: 1, cartons: 1, lines: [{ sku: "X", quantity: 1 }] },
          owner,
        ),
      ).resolves.toMatchObject({ reference: `${run}-KAPI` });
    } finally {
      delete process.env.EU_PARTY_GATE;
    }
  });

  it("ASN → aşama ilerletme → mal kabul: stok hasar hariç artar, hareketler yazılır", async () => {
    const s = await createAsn(
      A,
      {
        reference: "ASN-1",
        pallets: 2,
        cartons: 40,
        lines: [
          { sku: "HV-1", quantity: 100 },
          { sku: "YENI-9", quantity: 20 },
        ],
      },
      owner,
    );
    await expect(
      createAsn(
        A,
        { reference: "ASN-1", pallets: 1, cartons: 1, lines: [{ sku: "X", quantity: 1 }] },
        owner,
      ),
    ).rejects.toThrow(/zaten var/);
    await advanceStage(A, s.id, "GUMRUK", "Beyanname açıldı", owner);
    await receiveShipment(
      A,
      s.id,
      [
        { sku: "HV-1", receivedQty: 98, damagedQty: 3 },
        { sku: "YENI-9", receivedQty: 20, damagedQty: 0 },
      ],
      owner,
    );
    const items = await db().stockItem.findMany({
      where: { tenantId: A },
      orderBy: { sku: "asc" },
    });
    expect(items.find((i) => i.sku === "HV-1")?.quantity).toBe(95);
    expect(items.find((i) => i.sku === "YENI-9")?.quantity).toBe(20);
    expect(await db().stockMovement.count({ where: { tenantId: A, reason: "RECEIVE" } })).toBe(2);
    await expect(receiveShipment(A, s.id, [], owner)).rejects.toThrow(/zaten/);
    const events = await db().shipmentEvent.findMany({
      where: { shipmentId: s.id },
      orderBy: { at: "asc" },
    });
    expect(events.map((e) => e.stage)).toEqual(["FABRIKA", "GUMRUK", "DEPO_KABUL"]);
  });

  it("başka firma, A'nın sevkiyatını ilerletemez ve belge ekleyemez", async () => {
    const s = await db().shipment.findFirstOrThrow({ where: { tenantId: A } });
    await expect(advanceStage(B, s.id, "GUMRUK", null, owner)).rejects.toThrow(/bulunamadı/);
    const r = await uploadDocument({
      tenantId: B,
      shipmentId: s.id,
      kind: "ATR",
      filename: "a.pdf",
      data: Buffer.from("%PDF-1.4 x"),
      actorUserId: owner,
    });
    expect(r).toEqual({ ok: false, reason: "Sevkiyat bulunamadı" });
  });

  it("belge yükleme: PDF kabul, EXE ve virüslü dosya ret", async () => {
    const s = await db().shipment.findFirstOrThrow({ where: { tenantId: A } });
    const ok = await uploadDocument({
      tenantId: A,
      shipmentId: s.id,
      kind: "ATR",
      filename: "atr.pdf",
      data: Buffer.from("%PDF-1.4 test"),
      actorUserId: owner,
    });
    expect(ok.ok).toBe(true);
    const exe = await uploadDocument({
      tenantId: A,
      kind: "DIGER",
      filename: "fatura.pdf",
      data: Buffer.from([0x4d, 0x5a, 0x90, 0]),
      actorUserId: owner,
    });
    expect(exe.ok).toBe(false);
    const eicar = Buffer.from(
      "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*",
    );
    const vir = await uploadDocument({
      tenantId: A,
      kind: "DIGER",
      filename: "x.csv",
      data: eicar,
      actorUserId: owner,
    });
    expect(vir).toMatchObject({ ok: false, reason: expect.stringContaining("zararlı") });
  });

  it("genel bakış: eksik belgeler, satış kilidi, bekleme listesi", async () => {
    await createAsn(
      A,
      { reference: "ASN-2", pallets: 1, cartons: 5, lines: [{ sku: "HV-2", quantity: 5 }] },
      owner,
    );
    const o = await overview(A);
    expect(o.salesLocked).toBe(true);
    expect(o.missingDocs.find((m) => m.reference === "ASN-2")?.missing).toEqual([
      "TICARI_FATURA",
      "CEKI_LISTESI",
      "ATR",
      "CMR",
    ]);
    expect(o.units).toBe(115);
    const w = await waitingList(A);
    expect(w.find((x) => x.id === "catalog")?.done).toBe(true);
    expect(w.find((x) => x.id === "asn")?.done).toBe(true);
    expect(w.find((x) => x.id === "content")?.done).toBe(false);
    await db().registrationTask.updateMany({ where: { tenantId: A }, data: { status: "TAMAM" } });
    expect((await registrationState(A)).salesLocked).toBe(false);
  });

  it("ekip daveti ve çıkarma", async () => {
    expect(await inviteMember(A, { email: "x", name: "Y" }, owner)).toMatchObject({ ok: false });
    expect(await inviteMember(A, { email: `${run}-ali@ornek.test`, name: "Ali" }, owner)).toEqual({
      ok: true,
    });
    expect(
      await inviteMember(A, { email: `${run}-ali@ornek.test`, name: "Ali" }, owner),
    ).toMatchObject({ ok: false });
    const ali = await db().user.findUniqueOrThrow({ where: { email: `${run}-ali@ornek.test` } });
    expect(await removeMember(A, owner, owner)).toMatchObject({ ok: false });
    expect(await removeMember(B, ali.id, owner)).toMatchObject({ ok: false });
    expect(await removeMember(A, ali.id, owner)).toEqual({ ok: true });
  });
});
