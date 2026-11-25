import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@avrupadasat/ui";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-box">
      <Link href="/" style={{ textDecoration: "none" }}>
        <Logo />
      </Link>
      <div className="card" style={{ marginTop: 24 }}>
        {children}
      </div>
    </main>
  );
}
