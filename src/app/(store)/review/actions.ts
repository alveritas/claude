"use server";

import { revalidatePath } from "next/cache";
import { loadReviewableOrder } from "@/lib/server/reviews";
import { getServiceSupabase } from "@/lib/server/supabase";
import { parseReviewInput } from "@/lib/shared/reviews";

export interface ReviewState {
  error?: string;
  ok?: string;
}

/**
 * Saves one review. The link is checked again here (never trusted from the page), the line must
 * belong to that order, and each line can be reviewed once.
 */
export async function submitReview(_: ReviewState, fd: FormData): Promise<ReviewState> {
  const orderId = String(fd.get("order_id") ?? "");
  const token = String(fd.get("t") ?? "");
  const itemId = String(fd.get("order_item_id") ?? "");
  const order = await loadReviewableOrder(orderId, token);
  if ("error" in order) {
    return { error: order.error === "invalid" ? "This review link isn’t valid." : "Reviews can’t be left for this order." };
  }
  const item = order.ok.items.find((i) => i.id === itemId);
  if (!item) return { error: "That piece isn’t part of this order." };
  if (item.reviewed) return { error: "You’ve already reviewed this piece. Thank you." };
  const parsed = parseReviewInput(fd);
  if ("error" in parsed) return { error: parsed.error };
  const sb = getServiceSupabase();
  if (!sb) return { error: "Reviews aren’t available right now." };
  const { error } = await sb.from("reviews").insert({
    product_id: item.productId,
    order_id: order.ok.id,
    order_item_id: item.id,
    rating: parsed.ok.rating,
    title: parsed.ok.title,
    body: parsed.ok.body,
    author: parsed.ok.author,
    size: item.size,
    color: item.colorway,
    fit: parsed.ok.fit,
    status: "published",
  });
  if (error) {
    if (error.code === "23505") return { error: "You’ve already reviewed this piece. Thank you." };
    return { error: "Your review couldn’t be saved. Please try again." };
  }
  revalidatePath("/", "layout");
  return { ok: "Thank you. Your review is live." };
}
