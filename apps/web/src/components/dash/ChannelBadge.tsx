/**
 * Satış kanalı rozeti. Marka logoları kullanılmaz (ticari marka); kanal adının baş harfi ve
 * kanala özgü renk + tam ad metni gösterilir.
 */
const CH: Record<string, { mark: string; name: string; cls: string }> = {
  AMAZON: { mark: "a", name: "Amazon.de", cls: "ch-amz" },
  EBAY: { mark: "e", name: "eBay.de", cls: "ch-eby" },
  WEBSHOP: { mark: "S", name: "Shopify", cls: "ch-shp" },
  MANUAL: { mark: "M", name: "Manuel", cls: "ch-man" },
};

export function ChannelBadge({
  channel,
  withName = false,
}: {
  channel: string;
  withName?: boolean;
}) {
  const c = CH[channel] ?? { mark: "?", name: channel, cls: "ch-man" };
  return (
    <span className="ch" title={c.name}>
      <span className={`ch-mark ${c.cls}`} aria-hidden="true">
        {c.mark}
      </span>
      {withName ? (
        <span className="ch-name">{c.name}</span>
      ) : (
        <span className="sr-only">{c.name}</span>
      )}
    </span>
  );
}

export const CHANNEL_NAME = Object.fromEntries(Object.entries(CH).map(([k, v]) => [k, v.name]));
