"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/server/auth";
import { shippingConfirmationEmail, sendEmail } from "@/lib/server/email";
import { paymentMode, paymentsReady } from "@/lib/server/payments";
import { ensureSquareWebhook } from "@/lib/server/square";
import { reviewUrl } from "@/lib/server/reviews";
import { HIDE_REASONS } from "@/lib/shared/reviews";
import { adminProducts, adminSettings, adminZones } from "@/lib/server/admin-data";
import { releaseBlockers } from "@/lib/server/readiness";
import {
  getStripe,
  isOwnStaleEndpoint,
  saveWebhookSecret,
  stripeMode,
  turnOnStoreWallets,
  WEBHOOK_DESCRIPTION,
  WEBHOOK_EVENTS,
  webhookUrl,
  webhookUrlIsPublic,
} from "@/lib/server/stripe";
import { getServiceSupabase } from "@/lib/server/supabase";
import { CONTENT_FIELDS } from "@/lib/shared/content";
import { parseCountryList } from "@/lib/shared/countries";
import { slugify } from "@/lib/shared/format";
import { CATEGORIES } from "@/lib/shared/types";

export interface AdminState {
  error?: string;
  ok?: string;
}

const str = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);
const opt = (fd: FormData, k: string, max = 2000) => str(fd, k, max) || null;
const bool = (fd: FormData, k: string) => fd.get(k) === "on";

/** "49.00" → 4900. Empty → null. Invalid → NaN. */
function money(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}
function intOrNull(v: string): number | null {
  if (!v.trim()) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

function refreshStore() {
  revalidatePath("/", "layout");
}

/* ───────────── Launch & store settings ───────────── */
export async function saveSettings(_: AdminState, fd: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const launch = str(fd, "launch_date");
  const launchDate = launch ? new Date(launch) : null;
  if (launchDate && Number.isNaN(launchDate.getTime())) return { error: "The launch date isn’t valid." };
  const url = (k: string) => {
    const v = str(fd, k, 300);
    return v && /^https:\/\//.test(v) ? v : v ? "invalid" : null;
  };
  const instagram = url("instagram_url");
  const tiktok = url("tiktok_url");
  if (instagram === "invalid" || tiktok === "invalid") return { error: "Social links must start with https://" };
  const mode = str(fd, "mode") === "live" ? "live" : "prelaunch";

  const { error } = await supabase
    .from("store_settings")
    .update({
      mode,
      launch_date: launchDate ? launchDate.toISOString() : null,
      announcement: opt(fd, "announcement", 160),
      instagram_url: instagram,
      tiktok_url: tiktok,
      contact_email: opt(fd, "contact_email", 200),
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { error: error.message };
  refreshStore();
  return { ok: mode === "live" ? "Saved. The store is live." : "Saved. The store is in prelaunch mode." };
}

/**
 * Release: checks everything checkout needs, puts every Coming soon piece that has a price and
 * stock on sale, sets the release announcement and switches the store to live.
 */
export async function releaseStore(_: AdminState, fd: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const [settings, products, zones, webhookReady] = await Promise.all([
    adminSettings(supabase),
    adminProducts(supabase),
    adminZones(supabase),
    paymentsReady(),
  ]);
  const blockers = releaseBlockers({ settings, products, zones, webhookReady });
  if (blockers.length) return { error: `Not ready yet. ${blockers.join(" ")}` };
  const ready = products
    .filter((p) => p.status === "coming_soon" && p.priceCents != null && p.variants.some((v) => v.stock > 0))
    .map((p) => p.id);
  if (ready.length) {
    const { error } = await supabase.from("products").update({ status: "available" }).in("id", ready);
    if (error) return { error: error.message };
  }
  const { error } = await supabase
    .from("store_settings")
    .update({ mode: "live", announcement: opt(fd, "announcement", 160), updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { error: error.message };
  refreshStore();
  const onSale = products.filter((p) => p.status === "available").length + ready.length;
  return {
    ok: `Released. ${onSale} piece${onSale === 1 ? " is" : "s are"} on sale${paymentMode() === "test" ? " — in test mode, so only test payments work until you add the live key" : ""}.`,
  };
}

/* ───────────── Payments ───────────── */
/** Payments → "Reconnect order notifications" (Square). */
export async function reconnectSquare(_: AdminState, __: FormData): Promise<AdminState> {
  await requireAdmin();
  const r = await ensureSquareWebhook(true);
  revalidatePath("/admin/payments");
  return r.ok ? { ok: "Order notifications connected." } : { error: r.error ?? "Square didn’t accept the request." };
}

export async function savePaymentSettings(_: AdminState, fd: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const currency = str(fd, "currency", 3).toLowerCase() || "usd";
  if (!/^[a-z]{3}$/.test(currency)) return { error: "Currency must be a three-letter code such as usd." };
  const automaticTax = bool(fd, "automatic_tax");
  const stripe = getStripe();
  if (automaticTax) {
    // Checkout fails outright if automatic tax is on but Stripe Tax isn't set up, so check first.
    if (!stripe) return { error: "Connect Stripe before turning on automatic tax." };
    try {
      const tax = await stripe.tax.settings.retrieve();
      if (tax.status !== "active") {
        return { error: "Stripe Tax isn’t set up yet. Finish it in Stripe (More → Tax), then turn this on." };
      }
    } catch (e) {
      return { error: e instanceof Error ? `Stripe couldn’t confirm tax settings: ${e.message}` : "Stripe couldn’t confirm tax settings." };
    }
  }
  const { error } = await supabase
    .from("store_settings")
    .update({
      currency,
      allow_promotion_codes: bool(fd, "allow_promotion_codes"),
      automatic_tax: automaticTax,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { error: error.message };
  refreshStore();
  revalidatePath("/admin/payments");
  return { ok: "Payment settings saved." };
}

/**
 * Creates (or replaces) this site's webhook endpoint in Stripe and keeps its signing secret on
 * the server, so paid orders are recorded without copying secrets around. Test and live mode
 * each have their own endpoint; run this again after switching keys.
 */
export async function connectWebhook(_: AdminState, __: FormData): Promise<AdminState> {
  await requireAdmin();
  const stripe = getStripe();
  const mode = stripeMode();
  if (!stripe || !mode) return { error: "Add your Stripe secret key first (STRIPE_SECRET_KEY)." };
  if (!webhookUrlIsPublic()) {
    return { error: `Stripe can only send events to a public https address, and this site’s address is ${webhookUrl()}. Set NEXT_PUBLIC_SITE_URL to your live domain and redeploy.` };
  }
  const url = webhookUrl();
  try {
    const existing = await stripe.webhookEndpoints.list({ limit: 100 });
    // A signing secret is only shown when an endpoint is created, so any earlier endpoint for this
    // address is replaced rather than reused. Endpoints this store made for an earlier address
    // (e.g. the host's default subdomain before the domain was added) are removed too: their
    // secret is about to be overwritten, so they could only ever fail.
    for (const ep of existing.data) {
      if (ep.url === url || isOwnStaleEndpoint(ep, url)) await stripe.webhookEndpoints.del(ep.id);
    }
    const created = await stripe.webhookEndpoints.create({
      url,
      enabled_events: [...WEBHOOK_EVENTS],
      description: WEBHOOK_DESCRIPTION,
    });
    if (!created.secret) return { error: "Stripe created the webhook but didn’t return its signing secret. Try again." };
    await saveWebhookSecret(mode, created.secret);
  } catch (e) {
    return { error: e instanceof Error ? `Stripe: ${e.message}` : "Stripe rejected the request." };
  }
  // The store's wallets go on at the same time, so each mode is fully set up by this one button.
  let wallets = " Apple Pay and Cash App Pay are switched on.";
  try {
    await turnOnStoreWallets(stripe);
  } catch {
    wallets = " Apple Pay and Cash App Pay couldn’t be switched on yet; see Payment methods below.";
  }
  refreshStore();
  revalidatePath("/admin/payments");
  return { ok: `Order webhook connected in ${mode} mode.${wallets}` };
}

/** Payments → "Turn on Apple Pay and Cash App Pay". */
export async function enableStoreWallets(_: AdminState, __: FormData): Promise<AdminState> {
  await requireAdmin();
  const stripe = getStripe();
  const mode = stripeMode();
  if (!stripe || !mode) return { error: "Add your Stripe secret key first (STRIPE_SECRET_KEY)." };
  try {
    await turnOnStoreWallets(stripe);
  } catch (e) {
    return { error: e instanceof Error ? `Stripe: ${e.message}` : "Stripe rejected the request." };
  }
  revalidatePath("/admin/payments");
  return { ok: `Apple Pay and Cash App Pay are on in ${mode} mode.` };
}

/* ───────────── Products ───────────── */
export async function saveProduct(_: AdminState, fd: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const id = opt(fd, "id", 64);
  const name = str(fd, "name", 140);
  const slug = slugify(str(fd, "slug", 140) || name);
  const category = str(fd, "category");
  const price = money(str(fd, "price"));
  const status = str(fd, "status");
  if (!name) return { error: "Name is required." };
  if (!slug) return { error: "Slug is required." };
  if (!(CATEGORIES as readonly string[]).includes(category)) return { error: "Choose a category." };
  if (Number.isNaN(price)) return { error: "Price must be a number, e.g. 120 or 120.00." };
  if (!["draft", "coming_soon", "available", "archived"].includes(status)) return { error: "Choose a status." };

  const row = {
    name,
    slug,
    category,
    status,
    price_cents: price,
    color: opt(fd, "color", 60),
    description: opt(fd, "description"),
    fit: opt(fd, "fit"),
    composition: opt(fd, "composition"),
    care: opt(fd, "care"),
    size_guide: opt(fd, "size_guide", 5000),
    featured: bool(fd, "featured"),
    sort_order: parseInt(str(fd, "sort_order") || "0", 10) || 0,
    collection_id: opt(fd, "collection_id", 64),
  };

  if (id) {
    const { error } = await supabase.from("products").update(row).eq("id", id);
    if (error) return { error: error.code === "23505" ? "Another product already uses that slug." : error.message };
    refreshStore();
    return { ok: "Product saved." };
  }
  const { data, error } = await supabase.from("products").insert(row).select("id").single();
  if (error) return { error: error.code === "23505" ? "Another product already uses that slug." : error.message };
  refreshStore();
  redirect(`/admin/products/${data.id}?created=1`);
}

export async function deleteProduct(fd: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id", 64);
  const sb = getServiceSupabase();
  const { data: imgs } = await supabase.from("product_images").select("storage_path").eq("product_id", id);
  const paths = (imgs ?? []).map((i) => i.storage_path).filter(Boolean) as string[];
  if (sb && paths.length) await sb.storage.from("product-images").remove(paths);
  await supabase.from("products").delete().eq("id", id);
  refreshStore();
  redirect("/admin/products");
}

/** Sizes & inventory. Rows arrive as JSON from the variant editor. */
export async function saveVariants(_: AdminState, fd: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const productId = str(fd, "product_id", 64);
  let rows: { id?: string; size: string; sku?: string; stock: number | string }[];
  try {
    rows = JSON.parse(str(fd, "variants", 20000) || "[]");
  } catch {
    return { error: "Sizes couldn’t be read. Reload and try again." };
  }
  const clean = rows
    .map((r, i) => ({
      id: r.id && /^[0-9a-f-]{36}$/i.test(r.id) ? r.id : undefined,
      size: String(r.size ?? "").trim().slice(0, 20),
      sku: String(r.sku ?? "").trim().slice(0, 64) || null,
      stock: Number(r.stock),
      sort_order: i,
    }))
    .filter((r) => r.size);
  if (clean.some((r) => !Number.isInteger(r.stock) || r.stock < 0)) return { error: "Stock must be a whole number of 0 or more." };
  const sizes = clean.map((r) => r.size.toLowerCase());
  if (new Set(sizes).size !== sizes.length) return { error: "Each size can only appear once." };

  const { data: existing } = await supabase.from("product_variants").select("id").eq("product_id", productId);
  const keep = new Set(clean.map((r) => r.id).filter(Boolean));
  const remove = (existing ?? []).map((e) => e.id).filter((id) => !keep.has(id));
  if (remove.length) {
    const { error } = await supabase.from("product_variants").delete().in("id", remove);
    if (error) return { error: error.message };
  }
  for (const r of clean) {
    const payload = { product_id: productId, size: r.size, sku: r.sku, stock: r.stock, sort_order: r.sort_order };
    const { error } = r.id
      ? await supabase.from("product_variants").update(payload).eq("id", r.id)
      : await supabase.from("product_variants").insert(payload);
    if (error) return { error: error.code === "23505" ? `Size ${r.size} already exists.` : error.message };
  }
  refreshStore();
  return { ok: "Sizes and stock saved." };
}

/**
 * Product photos are uploaded by the admin's browser straight to Supabase Storage (storage
 * policies allow admins only), because hosting platforms cap request bodies at a few MB.
 * This action then records the uploaded files, after checking each one is a fresh file in this
 * product's folder that really exists in storage.
 */
export async function registerImages(_: AdminState, fd: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const sb = getServiceSupabase();
  if (!sb) return { error: "The Supabase secret (service role) key is missing, so uploads are off." };
  const productId = str(fd, "product_id", 64);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) return { error: "Save the product before adding images." };
  const paths = fd.getAll("paths").map(String).slice(0, 30);
  if (!paths.length) return { error: "Choose at least one image." };
  const shape = new RegExp(`^${productId}/[0-9a-f-]{36}\\.(jpg|png|webp|avif)$`, "i");
  if (paths.some((p) => !shape.test(p))) return { error: "That upload didn’t come from this page. Try again." };
  const { data: listed, error: listErr } = await sb.storage.from("product-images").list(productId, { limit: 1000 });
  if (listErr) return { error: listErr.message };
  const present = new Set((listed ?? []).map((o: { name: string }) => `${productId}/${o.name}`));
  const missing = paths.filter((p) => !present.has(p));
  if (missing.length) return { error: "An image didn’t finish uploading. Try again." };
  const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId);
  let order = count ?? 0;
  for (const path of paths) {
    const { data: pub } = sb.storage.from("product-images").getPublicUrl(path);
    const { error } = await supabase.from("product_images").insert({
      product_id: productId,
      url: pub.publicUrl,
      storage_path: path,
      alt: "",
      label: "",
      sort_order: order++,
    });
    if (error) return { error: error.message };
  }
  refreshStore();
  return { ok: `${paths.length} image${paths.length > 1 ? "s" : ""} added. Add alt text and a view name to each.` };
}

export async function updateImage(_: AdminState, fd: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const fit = str(fd, "fit") === "contain" ? "contain" : "cover";
  const focal = str(fd, "focal", 20) || "50% 35%";
  if (!/^\d{1,3}% \d{1,3}%$/.test(focal)) return { error: "Focal point looks like “50% 35%”." };
  const { error } = await supabase
    .from("product_images")
    .update({ alt: str(fd, "alt", 300), label: str(fd, "label", 60), fit, focal })
    .eq("id", str(fd, "id", 64));
  if (error) return { error: error.message };
  refreshStore();
  return { ok: "Saved." };
}

export async function moveImage(fd: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const productId = str(fd, "product_id", 64);
  const id = str(fd, "id", 64);
  const dir = str(fd, "dir") === "up" ? -1 : 1;
  const { data } = await supabase.from("product_images").select("id, sort_order").eq("product_id", productId).order("sort_order");
  const list = data ?? [];
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((x, k) => supabase.from("product_images").update({ sort_order: k }).eq("id", x.id)));
  refreshStore();
}

export async function deleteImage(fd: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id", 64);
  const { data } = await supabase.from("product_images").select("storage_path").eq("id", id).maybeSingle();
  await supabase.from("product_images").delete().eq("id", id);
  const sb = getServiceSupabase();
  if (sb && data?.storage_path) await sb.storage.from("product-images").remove([data.storage_path]);
  refreshStore();
}

/* ───────────── Collections ───────────── */
export async function saveCollection(_: AdminState, fd: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const id = opt(fd, "id", 64);
  const name = str(fd, "name", 80);
  if (!name) return { error: "Name is required." };
  const row = {
    name,
    slug: slugify(str(fd, "slug", 80) || name),
    description: opt(fd, "description", 500),
    sort_order: parseInt(str(fd, "sort_order") || "0", 10) || 0,
    is_published: bool(fd, "is_published"),
  };
  const { error } = id
    ? await supabase.from("collections").update(row).eq("id", id)
    : await supabase.from("collections").insert(row);
  if (error) return { error: error.code === "23505" ? "That slug is already used." : error.message };
  refreshStore();
  return { ok: id ? "Collection saved." : "Collection created." };
}

export async function deleteCollection(fd: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  await supabase.from("collections").delete().eq("id", str(fd, "id", 64));
  refreshStore();
}

/* ───────────── Content ───────────── */
export async function saveContent(_: AdminState, fd: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const rows = CONTENT_FIELDS.filter((f) => fd.has(f.key)).map((f) => ({
    key: f.key,
    value: str(fd, f.key, 20000),
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
  if (error) return { error: error.message };
  refreshStore();
  return { ok: "Content saved. Empty fields fall back to the default text." };
}

/* ───────────── Shipping ───────────── */
export async function saveDispatch(_: AdminState, fd: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const min = intOrNull(str(fd, "dispatch_min_days"));
  const max = intOrNull(str(fd, "dispatch_max_days"));
  if (Number.isNaN(min) || Number.isNaN(max)) return { error: "Use whole numbers of business days." };
  if (min != null && max != null && min > max) return { error: "The minimum can’t be more than the maximum." };
  const { error } = await supabase
    .from("store_settings")
    .update({ dispatch_min_days: min, dispatch_max_days: max, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return { error: error.message };
  refreshStore();
  return { ok: "Dispatch time saved." };
}

export async function saveZone(_: AdminState, fd: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const id = opt(fd, "id", 64);
  const name = str(fd, "name", 80);
  const { valid, invalid } = parseCountryList(str(fd, "countries", 2000));
  const rate = money(str(fd, "rate"));
  const freeOver = money(str(fd, "free_over"));
  const minDays = intOrNull(str(fd, "min_days"));
  const maxDays = intOrNull(str(fd, "max_days"));
  if (!name) return { error: "Name the zone, e.g. “United States”." };
  if (invalid.length) return { error: `Not recognised, or not a destination Stripe ships to: ${invalid.join(", ")}. Use two-letter codes like US, GB, FR, or * for everywhere else.` };
  if (!valid.length) return { error: "Add at least one country code, or * for everywhere else." };
  if (rate === null || Number.isNaN(rate)) return { error: "Enter the shipping rate (0 for free)." };
  if (Number.isNaN(freeOver) || Number.isNaN(minDays) || Number.isNaN(maxDays)) return { error: "Check the numbers." };
  if (minDays != null && maxDays != null && minDays > maxDays) return { error: "Minimum days can’t exceed maximum days." };
  const row = {
    name,
    countries: valid,
    rate_cents: rate,
    free_over_cents: freeOver,
    min_days: minDays,
    max_days: maxDays,
    is_active: bool(fd, "is_active"),
    sort_order: parseInt(str(fd, "sort_order") || "0", 10) || 0,
  };
  const { error } = id ? await supabase.from("shipping_zones").update(row).eq("id", id) : await supabase.from("shipping_zones").insert(row);
  if (error) return { error: error.message };
  refreshStore();
  return { ok: id ? "Zone saved." : "Zone added." };
}

export async function deleteZone(fd: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  await supabase.from("shipping_zones").delete().eq("id", str(fd, "id", 64));
  refreshStore();
}

/* ───────────── Orders ───────────── */
export async function updateOrder(_: AdminState, fd: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id", 64);
  const status = str(fd, "status");
  if (!["paid", "fulfilled", "shipped", "delivered", "refunded", "canceled"].includes(status)) return { error: "Choose a status." };
  const trackingUrl = opt(fd, "tracking_url", 500);
  if (trackingUrl && !/^https:\/\//.test(trackingUrl)) return { error: "Tracking link must start with https://" };
  const { data: before } = await supabase.from("orders").select("status, email, order_number, livemode").eq("id", id).maybeSingle();
  const update = {
    status,
    carrier: opt(fd, "carrier", 60),
    tracking_number: opt(fd, "tracking_number", 120),
    tracking_url: trackingUrl,
  };
  const { error } = await supabase.from("orders").update(update).eq("id", id);
  if (error) return { error: error.message };
  let note = "";
  if (status === "shipped" && before?.status !== "shipped" && bool(fd, "notify") && before?.email) {
    const sent = await sendEmail({
      to: before.email,
      ...shippingConfirmationEmail({
        orderNumber: before.order_number,
        carrier: update.carrier,
        trackingNumber: update.tracking_number,
        trackingUrl: update.tracking_url,
        reviewUrl: before.livemode === false ? null : await reviewUrl(id),
      }),
    });
    note = sent ? " Shipping email sent." : " Email isn’t configured, so no shipping email was sent.";
  }
  revalidatePath("/admin/orders");
  return { ok: `Order updated.${note}` };
}

/* ───────────── Reviews ───────────── */
/**
 * Hides a review that breaks the rules. Reviews can't be hidden for being critical: removing
 * honest negative reviews is against the FTC's review rules, so only these reasons are offered.
 */
export async function setReviewVisibility(_: AdminState, fd: FormData): Promise<AdminState> {
  const { supabase } = await requireAdmin();
  const id = str(fd, "id", 64);
  const show = str(fd, "show") === "1";
  const reason = str(fd, "reason", 80);
  if (!show && !(HIDE_REASONS as readonly string[]).includes(reason)) return { error: "Choose why this review breaks the rules." };
  const { error } = await supabase
    .from("reviews")
    .update(show ? { status: "published", hidden_reason: null } : { status: "hidden", hidden_reason: reason })
    .eq("id", id);
  if (error) return { error: error.message };
  refreshStore();
  revalidatePath("/admin/reviews");
  return { ok: show ? "Review shown again." : "Review hidden." };
}

/* ───────────── Newsletter ───────────── */
export async function deleteSubscriber(fd: FormData): Promise<void> {
  const { supabase } = await requireAdmin();
  await supabase.from("newsletter_subscribers").delete().eq("id", str(fd, "id", 64));
  revalidatePath("/admin/newsletter");
}

/* ───────────── Promotions (Stripe is the source of truth) ───────────── */
export async function createPromotion(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const stripe = getStripe();
  if (!stripe) return { error: "Connect Stripe to create promotion codes." };
  const code = str(fd, "code", 40).toUpperCase();
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return { error: "Codes use letters, numbers, - or _ (3–40 characters)." };
  const kind = str(fd, "kind");
  const value = Number(str(fd, "value"));
  if (!Number.isFinite(value) || value <= 0) return { error: "Enter the discount amount." };
  if (kind === "percent" && value > 100) return { error: "A percentage can’t exceed 100." };
  const currency = str(fd, "currency", 3).toLowerCase() || "usd";
  const maxRedemptions = intOrNull(str(fd, "max_redemptions"));
  const expires = str(fd, "expires_at");
  try {
    const coupon = await stripe.coupons.create(
      kind === "percent"
        ? { percent_off: value, duration: "once", name: code }
        : { amount_off: Math.round(value * 100), currency, duration: "once", name: code },
    );
    await stripe.promotionCodes.create({
      coupon: coupon.id,
      code,
      ...(maxRedemptions && !Number.isNaN(maxRedemptions) ? { max_redemptions: maxRedemptions } : {}),
      ...(expires ? { expires_at: Math.floor(new Date(expires).getTime() / 1000) } : {}),
    } as Parameters<typeof stripe.promotionCodes.create>[0]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Stripe rejected the promotion." };
  }
  revalidatePath("/admin/promotions");
  return { ok: `Code ${code} created. Turn on “Allow promotion codes” under Launch for it to appear at checkout.` };
}

export async function deactivatePromotion(fd: FormData): Promise<void> {
  await requireAdmin();
  const stripe = getStripe();
  if (!stripe) return;
  await stripe.promotionCodes.update(str(fd, "id", 64), { active: false });
  revalidatePath("/admin/promotions");
}
