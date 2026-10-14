import type { Metadata } from "next";
import { CollectionsView } from "@/components/views/MiscViews";

export const metadata: Metadata = { title: "Collections", alternates: { canonical: "/collections" } };

export default function CollectionsPage() {
  return <CollectionsView />;
}
