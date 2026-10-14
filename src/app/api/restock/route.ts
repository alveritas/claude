import { NextResponse } from "next/server";
import { getStoreData } from "@/lib/server/catalog";
import { getServiceSupabase } from "@/lib/server/supabase";
import { isValidEmail } from "@/lib/shared/format";

const json = (body: object, status = 200) => NextResponse.json(body, { status });

/** "Email me when it's back" for one sold-out size. Only accepted while that size really is sold out. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  const variantId = typeof body?.variantId === "string" ? body.variantId.slice(0, 64) : "";
  if (!isValidEmail(email)) return json({ ok: false, code: "invalid_email", message: "Enter a valid email address." }, 400);
  const { products, settings } = await getStoreData();
  const product = products.find((p) => p.variants.some((v) => v.id === variantId));
  const variant = product?.variants.find((v) => v.id === variantId);
  if (!product || !variant) return json({ ok: false, code: "unknown_size", message: "Choose a size." }, 400);
  if (variant.stock > 0 && product.status === "available") {
    return json({ ok: false, code: "in_stock", message: `${variant.size} is in stock now. You can order it straight away.` }, 409);
  }
  const sb = getServiceSupabase();
  if (!sb) {
    return json(
      {
        ok: false,
        code: "not_configured",
        message: settings.contactEmail
          ? `Restock emails aren’t switched on yet. Email ${settings.contactEmail} and we’ll let you know.`
          : "Restock emails aren’t switched on yet. Please check back soon.",
      },
      503,
    );
  }
  const { error } = await sb.from("restock_requests").insert({ email, product_id: product.id, variant_id: variant.id });
  if (error && error.code !== "23505") {
    console.error("restock request failed", error);
    return json({ ok: false, code: "server_error", message: "We couldn’t save that just now. Try again in a moment." }, 500);
  }
  return json({ ok: true });
}
