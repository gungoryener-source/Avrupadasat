import { PRICE_LIST_VERSION } from "@avrupadasat/core/pricing";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { status: "ok", priceList: PRICE_LIST_VERSION, time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
