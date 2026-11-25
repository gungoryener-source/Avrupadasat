import { brand } from "@avrupadasat/core/brand.config";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  const [first, second] = brand.nameParts;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 800 }}>
      <span
        aria-hidden
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "var(--p)",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontSize: 13,
        }}
      >
        {brand.monogram}
      </span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span style={{ fontSize: 19, color: inverted ? "#fff" : "var(--ink)" }}>
          {first}
          <b style={{ color: inverted ? "var(--gold)" : "var(--p)" }}>{second}</b>
        </span>
        <small
          style={{ fontSize: 11, fontWeight: 500, color: inverted ? "#c9cfdb" : "var(--mute)" }}
        >
          {brand.tagline}
        </small>
      </span>
    </span>
  );
}
