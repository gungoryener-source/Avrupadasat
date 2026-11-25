/**
 * Dış API çağrıları için ortak yardımcı: zaman aşımı, 429/5xx'te Retry-After veya üstel bekleme
 * ile en fazla 3 yeniden deneme. Yanıt gövdesi hata mesajına en fazla 300 karakter eklenir
 * (kişisel veri sızmasın diye loglara tam gövde yazılmaz).
 */
export interface HttpDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
}

export class ApiError extends Error {
  constructor(
    public service: string,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function requestWithRetry(
  service: string,
  url: string,
  init: RequestInit,
  deps: HttpDeps = {},
  isRetryable: (status: number, body: string) => boolean = (s) => s === 429 || s >= 500,
): Promise<{ status: number; body: string; headers: Headers }> {
  const f = deps.fetchImpl ?? fetch;
  const sleep = deps.sleep ?? wait;
  for (let attempt = 0; ; attempt++) {
    const signal = AbortSignal.timeout(deps.timeoutMs ?? 20_000);
    let res: Response;
    try {
      res = await f(url, { ...init, signal });
    } catch (e) {
      if (attempt >= 3)
        throw new ApiError(service, 0, `${service} bağlantı hatası: ${(e as Error).message}`);
      await sleep(500 * 2 ** attempt);
      continue;
    }
    const body = res.status === 204 ? "" : await res.text();
    if (res.ok && !isRetryable(res.status, body))
      return { status: res.status, body, headers: res.headers };
    if (isRetryable(res.status, body) && attempt < 3) {
      const ra = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra, 60) * 1000 : 500 * 2 ** attempt);
      continue;
    }
    if (res.ok) return { status: res.status, body, headers: res.headers };
    throw new ApiError(
      service,
      res.status,
      `${service} isteği başarısız (${res.status}): ${body.slice(0, 300)}`,
    );
  }
}

export function toCents(amount: string | number | undefined): number {
  const n = Number(amount ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
