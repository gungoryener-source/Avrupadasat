/**
 * Dosya depolama adaptörü. Varsayılan: yerel disk (public dizini DIŞINDA).
 * Üretimde S3 uyumlu AB bölgesi depolama ile değiştirilecek (aynı arayüz).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomToken } from "./tokens";

const ROOT =
  process.env.STORAGE_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), ".storage");

function resolve(key: string) {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(key)) throw new Error("Geçersiz depolama anahtarı");
  return path.join(/* turbopackIgnore: true */ ROOT, key.slice(0, 2), key);
}

export async function putObject(data: Buffer): Promise<string> {
  const key = randomToken(24);
  const file = resolve(key);
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await writeFile(file, data, { mode: 0o600, flag: "wx" });
  return key;
}

export async function getObject(key: string): Promise<Buffer> {
  return readFile(resolve(key));
}
