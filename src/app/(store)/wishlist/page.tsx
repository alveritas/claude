import type { Metadata } from "next";
import { WishlistView } from "@/components/views/MiscViews";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default function WishlistPage() {
  return <WishlistView />;
}
