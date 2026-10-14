import type { Metadata } from "next";
import { ReviewMessage, ReviewOrderView } from "@/components/views/ReviewViews";
import { loadReviewableOrder } from "@/lib/server/reviews";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Review your order", robots: { index: false, follow: false } };

type Props = { params: Promise<{ order: string }>; searchParams: Promise<{ t?: string }> };

/** Reached from the link in a customer's shipping email (or sent by the store from Admin → Orders). */
export default async function ReviewPage({ params, searchParams }: Props) {
  const [{ order }, { t }] = await Promise.all([params, searchParams]);
  const res = await loadReviewableOrder(order, t);
  if ("error" in res) return <ReviewMessage kind={res.error} />;
  return (
    <ReviewOrderView
      orderId={res.ok.id}
      orderNumber={res.ok.orderNumber}
      token={t ?? ""}
      defaultName={res.ok.defaultName}
      items={res.ok.items}
    />
  );
}
