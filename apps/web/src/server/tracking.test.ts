import { describe, expect, it } from "vitest";
import { trackingUrl } from "./tracking";

describe("taşıyıcı takip bağlantısı", () => {
  it("bilinen taşıyıcılar için bağlantı üretir, numarayı kodlar", () => {
    expect(trackingUrl("DHL", "00340434161234567890")).toContain(
      "tracking-id=00340434161234567890",
    );
    expect(trackingUrl("dpd", "01234567890123")).toContain("tracking.dpd.de");
    expect(trackingUrl("Hermes Germany", "H1234567890")).toContain("myhermes.de");
  });
  it("bilinmeyen taşıyıcı veya geçersiz numarada bağlantı yok", () => {
    expect(trackingUrl("Ekol Lojistik", "ABC123456")).toBeNull();
    expect(trackingUrl("DHL", "x")).toBeNull();
    expect(trackingUrl("DHL", "abc<script>")).toBeNull();
  });
});
