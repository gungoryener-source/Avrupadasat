/**
 * Belge depolama adaptörü. Anahtarlar rastgeledir; dosya adı veya firma bilgisi içermez.
 *   STORAGE_DRIVER=local (varsayılan) — public dizini DIŞINDA yerel disk (STORAGE_DIR)
 *   STORAGE_DRIVER=s3 — S3 uyumlu AB bölgesi depolama (AWS eu-central-1, Cloudflare R2 EU, MinIO)
 *     S3_BUCKET, S3_REGION, [S3_ENDPOINT], S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 *     Nesneler sunucu tarafında şifreli (SSE AES256) ve özel (public erişim yok) yazılır.
 *   STORAGE_DRIVER=blob — Vercel Blob, YALNIZ özel (private) erişim; okuma kimlik doğrulamalıdır.
 *     Vercel'de OIDC ile, başka yerde BLOB_READ_WRITE_TOKEN ile çalışır. Mağaza AB bölgesinde açılmalı.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { get as blobGet, put as blobPut } from "@vercel/blob";
import { randomToken } from "./tokens";

export interface ObjectStorage {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
}

const KEY_RE = /^[A-Za-z0-9_-]{20,80}$/;

function assertKey(key: string) {
  if (!KEY_RE.test(key)) throw new Error("Geçersiz depolama anahtarı");
}

export function localStorage(root: string): ObjectStorage {
  const resolve = (key: string) => {
    assertKey(key);
    return path.join(/* turbopackIgnore: true */ root, key.slice(0, 2), key);
  };
  return {
    async put(key, data) {
      const file = resolve(key);
      await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
      await writeFile(file, data, { mode: 0o600, flag: "wx" });
    },
    get: async (key) => readFile(resolve(key)),
  };
}

/** S3 istemcisi dışarıdan verilebilir (test için); `send` yeterli */
export function s3Storage(
  client: Pick<S3Client, "send">,
  bucket: string,
  prefix = "belgeler/",
): ObjectStorage {
  return {
    async put(key, data) {
      assertKey(key);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${prefix}${key}`,
          Body: data,
          ContentType: "application/octet-stream",
          ServerSideEncryption: "AES256",
          IfNoneMatch: "*",
        }),
      );
    },
    async get(key) {
      assertKey(key);
      const res = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: `${prefix}${key}` }),
      );
      if (!res.Body) throw new Error("Nesne boş");
      return Buffer.from(await res.Body.transformToByteArray());
    },
  };
}

type BlobApi = { put: typeof blobPut; get: typeof blobGet };

/** Vercel Blob (private). API dışarıdan verilebilir (test için). */
export function blobStorage(
  api: BlobApi = { put: blobPut, get: blobGet },
  prefix = "files/",
): ObjectStorage {
  return {
    async put(key, data) {
      assertKey(key);
      await api.put(`${prefix}${key}`, data, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: "application/octet-stream",
      });
    },
    async get(key) {
      assertKey(key);
      const r = await api.get(`${prefix}${key}`, { access: "private", useCache: false });
      if (!r || r.statusCode !== 200) throw new Error("Nesne bulunamadı");
      return Buffer.from(await new Response(r.stream).arrayBuffer());
    },
  };
}

let cached: ObjectStorage | null = null;

export function storage(env: NodeJS.ProcessEnv = process.env): ObjectStorage {
  if (cached && env === process.env) return cached;
  let s: ObjectStorage;
  if (env.STORAGE_DRIVER === "blob") {
    s = blobStorage();
  } else if ((env.STORAGE_DRIVER ?? "local") === "s3") {
    if (!env.S3_BUCKET || !env.S3_REGION) throw new Error("S3_BUCKET ve S3_REGION gerekli");
    s = s3Storage(
      new S3Client({
        region: env.S3_REGION,
        ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT, forcePathStyle: true } : {}),
        ...(env.S3_ACCESS_KEY_ID
          ? {
              credentials: {
                accessKeyId: env.S3_ACCESS_KEY_ID,
                secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
              },
            }
          : {}),
      }),
      env.S3_BUCKET,
    );
  } else {
    s = localStorage(
      env.STORAGE_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), ".storage"),
    );
  }
  if (env === process.env) cached = s;
  return s;
}

export async function putObject(data: Buffer): Promise<string> {
  const key = randomToken(24);
  await storage().put(key, data);
  return key;
}

export async function getObject(key: string): Promise<Buffer> {
  return storage().get(key);
}
