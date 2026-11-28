import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";
import { blobStorage, localStorage, s3Storage, storage } from "./storage";

const KEY = "abcdefghijklmnopqrstuvwxyz012345";

describe("depolama", () => {
  it("yerel: yazar, okur; aynı anahtarın üzerine yazmaz; yol gezinmesini reddeder", async () => {
    const s = localStorage(mkdtempSync(path.join(tmpdir(), "as-st-")));
    await s.put(KEY, Buffer.from("merhaba"));
    expect((await s.get(KEY)).toString()).toBe("merhaba");
    await expect(s.put(KEY, Buffer.from("x"))).rejects.toThrow();
    await expect(s.get("../../etc/passwd")).rejects.toThrow(/Geçersiz/);
  });

  it("S3: özel, sunucu tarafı şifreli, üzerine yazmayan PUT; önekli anahtar; GET", async () => {
    const sent: unknown[] = [];
    const client = {
      send: async (cmd: unknown) => {
        sent.push(cmd);
        if (cmd instanceof GetObjectCommand)
          return {
            Body: { transformToByteArray: async () => new TextEncoder().encode("pdf-icerik") },
          };
        return {};
      },
    };
    const s = s3Storage(client as never, "avrupadasat-belgeler");
    await s.put(KEY, Buffer.from("pdf-icerik"));
    const put = sent[0] as PutObjectCommand;
    expect(put).toBeInstanceOf(PutObjectCommand);
    expect(put.input).toMatchObject({
      Bucket: "avrupadasat-belgeler",
      Key: `belgeler/${KEY}`,
      ServerSideEncryption: "AES256",
      IfNoneMatch: "*",
    });
    expect(put.input).not.toHaveProperty("ACL");
    expect((await s.get(KEY)).toString()).toBe("pdf-icerik");
    await expect(s.get("x/../y")).rejects.toThrow(/Geçersiz/);
  });

  it("S3 sürücüsü kova ve bölge olmadan başlamaz", () => {
    expect(() => storage({ STORAGE_DRIVER: "s3" } as unknown as NodeJS.ProcessEnv)).toThrow(
      /S3_BUCKET/,
    );
    expect(() =>
      storage({
        STORAGE_DRIVER: "s3",
        S3_BUCKET: "b",
        S3_REGION: "eu-central-1",
      } as unknown as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it("Blob sürücüsü yalnız private yazar/okur, üzerine yazmaz, anahtarı doğrular", async () => {
    const calls: { path: string; opts: Record<string, unknown> }[] = [];
    const store = new Map<string, Buffer>();
    const api = {
      put: async (p: string, data: Buffer, opts: Record<string, unknown>) => {
        calls.push({ path: p, opts });
        store.set(p, data);
        return {} as never;
      },
      get: async (p: string, opts: Record<string, unknown>) => {
        calls.push({ path: p, opts });
        const d = store.get(p);
        return d ? ({ statusCode: 200, stream: new Response(d).body } as never) : null;
      },
    };
    const s = blobStorage(api as never);
    await s.put(KEY, Buffer.from("gizli"));
    expect(calls[0]).toMatchObject({
      path: `files/${KEY}`,
      opts: { access: "private", addRandomSuffix: false, allowOverwrite: false },
    });
    expect((await s.get(KEY)).toString()).toBe("gizli");
    expect(calls[1]?.opts).toMatchObject({ access: "private" });
    await expect(s.get("ab".repeat(15))).rejects.toThrow(/bulunamadı/);
    await expect(s.put("../x", Buffer.from("x"))).rejects.toThrow(/Geçersiz/);
  });
});
