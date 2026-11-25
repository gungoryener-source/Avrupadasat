import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";
import { localStorage, s3Storage, storage } from "./storage";

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
});
