import type { Metadata } from "next";
import { CashAppOrderView } from "@/components/views/CheckoutView";
import { cashAppPayUrl, cashTag } from "@/lib/server/cashapp";
import { getCashAppOrder } from "@/lib/server/cashapp-orders";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ ref?: string }> };

/** A placed Cash App order: what to send and where. The ref in the link is the only key. */
export default async function CashAppOrderPage({ searchParams }: Props) {
  const { ref } = await searchParams;
  const order = await getCashAppOrder(ref);
  const tag = cashTag();
  return <CashAppOrderView order={order} cashTag={tag} payUrl={order && tag ? cashAppPayUrl(tag, order.totalCents) : null} />;
}
