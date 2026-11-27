import { brand } from "@avrupadasat/core/brand.config";

/**
 * Logo: monogram + iki parçalı ad ("Avrupada" + vurgulu "Sat").
 * `tagline` kapalıysa yalnız ad gösterilir (üst menü).
 */
export function Logo({
  inverted = false,
  tagline = true,
}: {
  inverted?: boolean;
  tagline?: boolean;
}) {
  const [first, second] = brand.nameParts;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden focusable="false">
        <rect width="32" height="32" rx="9" fill={inverted ? "#fff" : "var(--navy)"} />
        <path
          d="M9 22.5 16 9l7 13.5"
          fill="none"
          stroke={inverted ? "var(--navy)" : "#fff"}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="18.2" r="2.3" fill="var(--accent)" />
      </svg>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: inverted ? "#fff" : "var(--ink)",
          }}
        >
          {first}
          <span style={{ color: inverted ? "var(--gold)" : "var(--p)" }}>{second}</span>
        </span>
        {tagline && (
          <small
            style={{
              fontSize: 11,
              fontWeight: 500,
              marginTop: 2,
              color: inverted ? "#a9b4c8" : "var(--mute)",
            }}
          >
            {brand.tagline}
          </small>
        )}
      </span>
    </span>
  );
}
