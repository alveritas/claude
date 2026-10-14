-- NEVERHOLLOW storefront schema.
-- Run in the Supabase SQL editor (or `supabase db push`), then run supabase/seed.sql.
-- Safe to run again: tables, functions and policies are created or replaced.

create extension if not exists pgcrypto;

-- ───────────────────────── Profiles & roles ─────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ───────────────────────── Store configuration ─────────────────────────
create table if not exists public.store_settings (
  id int primary key default 1 check (id = 1),
  mode text not null default 'prelaunch' check (mode in ('prelaunch', 'live')),
  launch_date timestamptz,
  announcement text,
  currency text not null default 'usd',
  allow_promotion_codes boolean not null default false,
  automatic_tax boolean not null default false,
  instagram_url text,
  tiktok_url text,
  contact_email text,
  updated_at timestamptz not null default now()
);
insert into public.store_settings (id) values (1) on conflict (id) do nothing;
-- Added for release: dispatch time shown on the Shipping page.
alter table public.store_settings add column if not exists dispatch_min_days int check (dispatch_min_days is null or dispatch_min_days >= 0);
alter table public.store_settings add column if not exists dispatch_max_days int check (dispatch_max_days is null or dispatch_max_days >= 0);

-- Server-only values the site provisions for itself (the Stripe webhook signing secret, the time
-- of the last Stripe event). RLS is on with no policies and API roles have no grants, so only
-- the service role used on the server can read or write it.
create table if not exists public.store_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_content (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Catalogue ─────────────────────────
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  category text not null check (category in ('tops', 'hoodies', 'bottoms', 'footwear', 'accessories')),
  color text,
  description text,
  fit text,
  composition text,
  care text,
  size_guide text,
  price_cents int check (price_cents is null or price_cents >= 0),
  status text not null default 'draft' check (status in ('draft', 'coming_soon', 'available', 'archived')),
  featured boolean not null default false,
  sort_order int not null default 0,
  collection_id uuid references public.collections (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep the category list current on databases created from an earlier version of this file.
update public.products set category = 'bottoms' where category = 'denim';
alter table public.products drop constraint if exists products_category_check;
alter table public.products add constraint products_category_check
  check (category in ('tops', 'hoodies', 'bottoms', 'footwear', 'accessories'));

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null,
  storage_path text,
  alt text not null default '',
  label text not null default '',
  fit text not null default 'cover' check (fit in ('cover', 'contain')),
  focal text not null default '50% 35%',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images (product_id, sort_order);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  size text not null,
  sku text,
  stock int not null default 0 check (stock >= 0),
  sort_order int not null default 0,
  unique (product_id, size)
);

-- ───────────────────────── Shipping ─────────────────────────
create table if not exists public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  countries text[] not null check (array_length(countries, 1) > 0),
  rate_cents int not null default 0 check (rate_cents >= 0),
  free_over_cents int check (free_over_cents is null or free_over_cents >= 0),
  min_days int,
  max_days int,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Customers ─────────────────────────
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  consent boolean not null check (consent),
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  region text,
  postal_code text,
  country text not null check (country ~ '^[A-Z]{2}$'),
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Orders (written by the Stripe webhook) ─────────────────────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  stripe_session_id text not null unique,
  stripe_payment_intent text,
  user_id uuid references auth.users (id) on delete set null,
  email text,
  status text not null default 'paid'
    check (status in ('paid', 'fulfilled', 'shipped', 'delivered', 'refunded', 'canceled')),
  currency text not null,
  subtotal_cents int not null default 0,
  shipping_cents int not null default 0,
  tax_cents int not null default 0,
  discount_cents int not null default 0,
  total_cents int not null default 0,
  shipping_name text,
  shipping_address jsonb,
  carrier text,
  tracking_number text,
  tracking_url text,
  stock_issue boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
-- Test-mode purchases are recorded (so the flow can be checked end to end) but marked, and they
-- don't touch real stock.
alter table public.orders add column if not exists livemode boolean not null default true;
-- Collected by Stripe Checkout; carriers usually need it for international parcels.
alter table public.orders add column if not exists phone text;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  name text not null,
  size text,
  color text,
  unit_price_cents int not null,
  quantity int not null check (quantity > 0)
);

-- Atomic stock decrement used by the webhook. Returns false if there wasn't enough stock.
create or replace function public.decrement_stock(p_variant uuid, p_qty int)
returns boolean language plpgsql security definer set search_path = public as $$
declare updated int;
begin
  update public.product_variants set stock = stock - p_qty
   where id = p_variant and stock >= p_qty;
  get diagnostics updated = row_count;
  return updated = 1;
end;
$$;
revoke execute on function public.decrement_stock(uuid, int) from public, anon, authenticated;

-- updated_at helpers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.store_settings enable row level security;
alter table public.store_secrets enable row level security;
revoke all on public.store_secrets from anon, authenticated;
alter table public.site_content enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Profiles: you can read your own; only your display name is editable from the site.
-- Roles are granted in the SQL editor (see SETUP.md), never through the API.
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Public storefront reads
drop policy if exists "settings public read" on public.store_settings;
create policy "settings public read" on public.store_settings for select using (true);
drop policy if exists "content public read" on public.site_content;
create policy "content public read" on public.site_content for select using (true);
drop policy if exists "collections public read" on public.collections;
create policy "collections public read" on public.collections for select using (is_published or public.is_admin());
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products for select
  using (status in ('coming_soon', 'available') or public.is_admin());
drop policy if exists "images public read" on public.product_images;
create policy "images public read" on public.product_images for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.status in ('coming_soon', 'available') or public.is_admin()))
);
drop policy if exists "variants public read" on public.product_variants;
create policy "variants public read" on public.product_variants for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.status in ('coming_soon', 'available') or public.is_admin()))
);
drop policy if exists "zones public read" on public.shipping_zones;
create policy "zones public read" on public.shipping_zones for select using (is_active or public.is_admin());

-- Admin writes
drop policy if exists "settings admin write" on public.store_settings;
create policy "settings admin write" on public.store_settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "content admin write" on public.site_content;
create policy "content admin write" on public.site_content for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "collections admin write" on public.collections;
create policy "collections admin write" on public.collections for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "images admin write" on public.product_images;
create policy "images admin write" on public.product_images for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "variants admin write" on public.product_variants;
create policy "variants admin write" on public.product_variants for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "zones admin write" on public.shipping_zones;
create policy "zones admin write" on public.shipping_zones for all using (public.is_admin()) with check (public.is_admin());

-- Newsletter: inserted by the server (service role). Only admins can read or delete.
drop policy if exists "newsletter admin read" on public.newsletter_subscribers;
create policy "newsletter admin read" on public.newsletter_subscribers for select using (public.is_admin());
drop policy if exists "newsletter admin delete" on public.newsletter_subscribers;
create policy "newsletter admin delete" on public.newsletter_subscribers for delete using (public.is_admin());

-- Customer-owned data
drop policy if exists "wishlist own" on public.wishlist_items;
create policy "wishlist own" on public.wishlist_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "addresses own" on public.addresses;
create policy "addresses own" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Orders: customers read their own; admins read and update. Inserts only via the service role.
drop policy if exists "orders own read" on public.orders;
create policy "orders own read" on public.orders for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "order items read" on public.order_items;
create policy "order items read" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin()))
);

-- ───────────────────────── Storage: product images ─────────────────────────
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "product images admin insert" on storage.objects;
create policy "product images admin insert" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update" on storage.objects for update using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin());

-- ───────────────────────── Reviews (verified buyers only) ─────────────────────────
-- Written only by the server, from the signed link each customer gets with their order. One
-- review per order line, so every review is tied to a real paid purchase. Reviews publish
-- straight away; the admin can hide one that breaks the rules (abuse, personal details, spam,
-- not about the product), never because it's critical.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid not null unique references public.order_items (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  title text check (char_length(title) <= 80),
  body text not null check (char_length(body) between 10 and 2000),
  author text not null check (char_length(author) between 1 and 40),
  size text,
  color text,
  fit text check (fit in ('small', 'true', 'large')),
  status text not null default 'published' check (status in ('published', 'hidden')),
  hidden_reason text,
  created_at timestamptz not null default now()
);
create index if not exists reviews_product_idx on public.reviews (product_id, created_at desc);
alter table public.reviews enable row level security;

drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read" on public.reviews for select using (status = 'published');
drop policy if exists "reviews admin read" on public.reviews;
create policy "reviews admin read" on public.reviews for select using (public.is_admin());
drop policy if exists "reviews admin update" on public.reviews;
create policy "reviews admin update" on public.reviews for update using (public.is_admin()) with check (public.is_admin());
-- No insert or delete policy: reviews are created by the server after checking the link.

-- The public sees what's on the page, not which order a review came from. The admin pages read
-- the full rows with the server's key after checking the admin.
revoke all on public.reviews from anon, authenticated;
grant select (id, product_id, rating, title, body, author, size, color, fit, status, created_at) on public.reviews to anon, authenticated;
grant update (status, hidden_reason) on public.reviews to authenticated;

-- ───────────────────────── Square payments ─────────────────────────
-- Which payment company took the order. For Square orders, stripe_session_id holds
-- "square:<Square order id>" (unique, so an order is never recorded twice) and
-- stripe_payment_intent holds the Square payment id.
alter table public.orders add column if not exists payment_provider text not null default 'stripe';
-- Anything the owner should check before shipping, e.g. an address in a different zone.
alter table public.orders add column if not exists note text;

-- Links the buyer's return to the confirmation page with their Square order. Server only.
create table if not exists public.checkout_refs (
  ref uuid primary key,
  provider text not null,
  provider_order_id text not null,
  created_at timestamptz not null default now()
);
alter table public.checkout_refs enable row level security;
revoke all on public.checkout_refs from anon, authenticated;

-- ───────────────────────── PayPal payments ─────────────────────────
-- For PayPal orders, stripe_session_id holds "paypal:<transaction id>" (unique). checkout_ref
-- links the buyer's return to the confirmation page with their order.
alter table public.orders add column if not exists checkout_ref uuid;
create index if not exists orders_checkout_ref_idx on public.orders (checkout_ref);

-- ───────────────────────── Checkout details and Cash App ─────────────────────────
-- What the shopper typed on the checkout page (contact and shipping), kept with the checkout so
-- the order can use it (their phone number, mainly) when the payment company doesn't send it.
alter table public.checkout_refs add column if not exists details jsonb;
-- Cash App orders wait as "awaiting_payment" until the owner sees the money in Cash App and
-- marks them Paid. stripe_session_id holds "cashapp:<checkout ref>".
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('awaiting_payment', 'paid', 'fulfilled', 'shipped', 'delivered', 'refunded', 'canceled'));

-- ───────────────────────── Back-in-stock requests ─────────────────────────
-- One row per shopper per sold-out size. Written by the server only; the owner reads them in
-- the admin. notified_at is set when the restock email goes out, so nobody is emailed twice.
create table if not exists public.restock_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  product_id uuid references public.products (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (email, variant_id)
);
alter table public.restock_requests enable row level security;
revoke all on public.restock_requests from anon, authenticated;
grant select on public.restock_requests to authenticated;
drop policy if exists "restock admin read" on public.restock_requests;
create policy "restock admin read" on public.restock_requests for select using (public.is_admin());
