import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { labelsPdf } from "./label-pdf";

const item = {
  code: "DK01YAEQ",
  name: "Bornoz M lacivert — %100 pamuk, şal yaka",
  sku: "BRN-M-LAC",
};

describe("etiket PDF", () => {
  it("termal: her etiket ayrı sayfa (50×25 mm)", async () => {
    const pdf = await PDFDocument.load(await labelsPdf([{ item, count: 3 }], "termal"));
    expect(pdf.getPageCount()).toBe(3);
    const { width, height } = pdf.getPage(0).getSize();
    expect(Math.round(width / (72 / 25.4))).toBe(50);
    expect(Math.round(height / (72 / 25.4))).toBe(25);
  });

  it("A4: sayfa başına 24 etiket", async () => {
    const pdf = await PDFDocument.load(
      await labelsPdf(
        [
          { item, count: 20 },
          { item: { ...item, code: "DGNMKB3V", sku: "HV-50" }, count: 5 },
        ],
        "a4",
      ),
    );
    expect(pdf.getPageCount()).toBe(2);
  });

  it("adet sınırları", async () => {
    await expect(labelsPdf([{ item, count: 0 }], "a4")).rejects.toThrow();
    await expect(labelsPdf([{ item, count: 2001 }], "a4")).rejects.toThrow();
  });
});
