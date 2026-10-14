import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopSkeleton } from "@/components/views/Skeletons";
import { ShopView } from "@/components/views/ShopView";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse the NEVERHOLLOW collection: tops, hoodies, bottoms and footwear.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage() {
  return (
    <Suspense fallback={<ShopSkeleton />}>
      <ShopView />
    </Suspense>
  );
}
