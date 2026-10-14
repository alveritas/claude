import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Keeps a signed-in customer's wishlist in Supabase (RLS: users only touch their own rows). */
export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ ok: false, code: "unauthenticated", message: "Sign in to sync your wishlist." }, { status: 401 });
  const { supabase, user } = session;
  const body = await req.json().catch(() => ({}));
  const action = body.action as "merge" | "add" | "remove";
  const ids: string[] = Array.isArray(body.productIds) ? body.productIds.filter((x: unknown) => typeof x === "string" && UUID.test(x)).slice(0, 200) : [];

  if (action === "add" || action === "merge") {
    if (ids.length) {
      const { error } = await supabase
        .from("wishlist_items")
        .upsert(ids.map((product_id) => ({ user_id: user.id, product_id })), { onConflict: "user_id,product_id", ignoreDuplicates: true });
      if (error) console.error("wishlist upsert failed", error.message);
    }
  } else if (action === "remove") {
    if (ids.length) await supabase.from("wishlist_items").delete().eq("user_id", user.id).in("product_id", ids);
  } else {
    return NextResponse.json({ ok: false, code: "bad_request", message: "Unknown action." }, { status: 400 });
  }
  const { data } = await supabase.from("wishlist_items").select("product_id").eq("user_id", user.id).order("created_at");
  return NextResponse.json({ ok: true, data: { productIds: (data ?? []).map((r) => r.product_id) } });
}
