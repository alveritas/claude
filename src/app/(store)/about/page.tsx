import type { Metadata } from "next";
import { AboutView } from "@/components/views/MiscViews";

export const metadata: Metadata = {
  title: "About",
  description: "NEVERHOLLOW is built on the idea that clothing should speak through its construction, silhouette, and presence.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <AboutView />;
}
