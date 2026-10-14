import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Account", robots: { index: false } };
// Account pages are per-user and never cached.
export const dynamic = "force-dynamic";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <div className="shell pb-24 pt-12 md:pt-20">{children}</div>;
}
