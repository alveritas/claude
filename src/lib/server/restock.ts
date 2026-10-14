/**
 * Back-in-stock alerts: a shopper leaves their email on a sold-out size; when the owner puts that
 * size back in stock in the admin, everyone waiting gets one email. Requests are kept by the
 * server only (they need the database), and nobody is emailed twice.
 */
import { restockEmail, sendEmail } from "./email";
import { hasEmail, siteUrl } from "./env";
import { getServiceSupabase } from "./supabase";

/** Emails everyone waiting on these sizes (now back in stock). Returns how many asked and how many were emailed. */
export async function sendRestockAlerts(variantIds: string[]): Promise<{ waiting: number; sent: number }> {
  const sb = getServiceSupabase();
  if (!sb || !variantIds.length) return { waiting: 0, sent: 0 };
  const { data } = await sb.from("restock_requests").select("id, email, variant_id, notified_at").in("variant_id", variantIds);
  const waiting = (data ?? []).filter((r) => !r.notified_at);
  if (!waiting.length || !hasEmail()) return { waiting: waiting.length, sent: 0 };
  // Read straight from the database (not the cached catalogue): the stock was just changed.
  const { data: variants } = await sb.from("product_variants").select("id, size, stock, product_id").in("id", variantIds);
  const productIds = [...new Set((variants ?? []).map((v) => v.product_id))];
  const { data: products } = productIds.length ? await sb.from("products").select("id, name, slug").in("id", productIds) : { data: [] };
  let sent = 0;
  for (const r of waiting) {
    const variant = (variants ?? []).find((v) => v.id === r.variant_id);
    const product = (products ?? []).find((p) => p.id === variant?.product_id);
    if (!product || !variant || variant.stock <= 0) continue;
    const ok = await sendEmail({ to: r.email, ...restockEmail({ productName: product.name, size: variant.size, url: `${siteUrl()}/products/${product.slug}` }) });
    if (ok) {
      sent++;
      await sb.from("restock_requests").update({ notified_at: new Date().toISOString() }).eq("id", r.id);
    }
  }
  return { waiting: waiting.length, sent };
}
