import type { Metadata } from "next";
import { CheckoutView } from "@/components/views/CheckoutView";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

/** Contact and shipping details, then payment. The bag lives on the shopper's device. */
export default function CheckoutPage() {
  return <CheckoutView />;
}
