import type { Metadata } from "next";
import { CartView } from "@/components/views/MiscViews";

export const metadata: Metadata = { title: "Bag", robots: { index: false } };

export default function CartPage() {
  return <CartView />;
}
