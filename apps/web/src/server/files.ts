import { createHash, createHmac } from "node:crypto";
import { connect } from "node:net";
import { safeEqual } from "./tokens";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** İzinli türler: uzantıya değil dosyanın İLK BAYTLARINA bakılır */
export type DetectedType = { mime: string; ext: string };

export function detectType(buf: Buffer): DetectedType | null {
  const head = buf.subarray(0, 8);
  if (head.subarray(0, 5).toString("latin1") === "%PDF-")
    return { mime: "application/pdf", ext: "pdf" };
  if (head[0] === 0x89 && head.subarray(1, 4).toString("latin1") === "PNG")
    return { mime: "image/png", ext: "png" };
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff)
    return { mime: "image/jpeg", ext: "jpg" };
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) {
    // OOXML (xlsx/docx) ZIP konteyneri: içerik türünü dosya içinden ayırt et
    const s = buf.subarray(0, Math.min(buf.length, 4096)).toString("latin1");
    if (s.includes("xl/"))
      return {
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ext: "xlsx",
      };
    if (s.includes("word/"))
      return {
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ext: "docx",
      };
    return null;
  }
  // CSV / düz metin: yazdırılabilir UTF-8, NUL yok
  const sample = buf.subarray(0, Math.min(buf.length, 2048));
  if (
    sample.length > 0 &&
    !sample.includes(0) &&
    /^[\s\S]*$/.test(sample.toString("utf8")) &&
    !sample.toString("utf8").includes("�")
  ) {
    return { mime: "text/csv", ext: "csv" };
  }
  return null;
}

export function sanitizeFilename(name: string, ext: string): string {
  const base = name
    .normalize("NFKC")
    .replace(/\.[^.]*$/, "")
    .replace(/[^\p{L}\p{N} ._()-]/gu, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${base || "belge"}.${ext}`;
}

export function sha256Buf(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/* ---------- Süreli imzalı indirme bağlantısı ---------- */

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production")
      throw new Error("AUTH_SECRET en az 32 karakter olmalı");
    return "gelistirme-icin-yerel-anahtar-yalniz-dev-0001";
  }
  return s;
}

export function signDownload(docId: string, userId: string, ttlSec = 300, now = Date.now()) {
  const exp = Math.floor(now / 1000) + ttlSec;
  const sig = createHmac("sha256", secret())
    .update(`${docId}.${userId}.${exp}`)
    .digest("base64url");
  return `/api/dosya/${docId}?e=${exp}&s=${sig}`;
}

export function verifyDownload(
  docId: string,
  userId: string,
  exp: string | null,
  sig: string | null,
  now = Date.now(),
): boolean {
  if (!exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) * 1000 < now) return false;
  const expected = createHmac("sha256", secret())
    .update(`${docId}.${userId}.${exp}`)
    .digest("base64url");
  return safeEqual(expected, sig);
}

/* ---------- Virüs tarama ---------- */

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

/**
 * CLAMAV_HOST tanımlıysa clamd INSTREAM ile tarar. Değilse "skipped" döner;
 * mock modda bile EICAR test dizisi yakalanır (akışın testi için).
 */
export async function scanBuffer(buf: Buffer): Promise<"clean" | "infected" | "skipped" | "error"> {
  if (buf.includes(Buffer.from(EICAR))) return "infected";
  const host = process.env.CLAMAV_HOST;
  if (!host) return "skipped";
  const port = Number(process.env.CLAMAV_PORT ?? 3310);
  return new Promise((resolve) => {
    const sock = connect({ host, port });
    let out = "";
    sock.setTimeout(15_000, () => {
      sock.destroy();
      resolve("error");
    });
    sock.on("error", () => resolve("error"));
    sock.on("data", (d) => (out += d.toString()));
    sock.on("end", () =>
      resolve(out.includes("FOUND") ? "infected" : out.includes("OK") ? "clean" : "error"),
    );
    sock.write("zINSTREAM\0");
    for (let i = 0; i < buf.length; i += 64 * 1024) {
      const chunk = buf.subarray(i, i + 64 * 1024);
      const len = Buffer.alloc(4);
      len.writeUInt32BE(chunk.length);
      sock.write(len);
      sock.write(chunk);
    }
    sock.end(Buffer.alloc(4));
  });
}
