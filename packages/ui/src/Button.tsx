import type { AnchorHTMLAttributes } from "react";

type Variant = "primary" | "outline";

const styles: Record<Variant, React.CSSProperties> = {
  primary: { background: "var(--p)", color: "#fff", border: "1px solid var(--p)" },
  outline: { background: "transparent", color: "var(--ink)", border: "1px solid var(--line)" },
};

export function ButtonLink({
  variant = "primary",
  style,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return (
    <a
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px 20px",
        borderRadius: 12,
        fontWeight: 700,
        textDecoration: "none",
        ...styles[variant],
        ...style,
      }}
    />
  );
}
