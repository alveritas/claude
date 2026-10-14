# NEVERHOLLOW storefront

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (data, auth, storage) · Square checkout (card, Apple Pay, Google Pay, Cash App Pay).

**Start with [SETUP.md](./SETUP.md)**: the step-by-step guide to deploying on Vercel or Netlify, connecting payments and launching.

## What's here

| Area | Where |
| --- | --- |
| Storefront pages | `src/app/(store)/…` home, shop, collections, products, cart, wishlist, about, info pages, account |
| Admin dashboard | `src/app/admin/…` launch mode, products, sizes and stock, images, collections, content, shipping, orders, newsletter, promotions |
| API | `src/app/api/…` newsletter, checkout, Square webhook (Stripe kept as a fallback), wishlist sync; `src/app/auth/callback` |
| UI components | `src/components/…` |
| Shared logic | `src/lib/shared/…` purchase rules, filters, content model (also used in the browser) |
| Server-only logic | `src/lib/server/…` Supabase, Stripe, email, readiness checks |
| Database | `supabase/migrations/0001_init.sql` (schema + Row Level Security), `supabase/seed.sql` (Drop 001) |
| Drop 001 catalog | `src/data/seed.ts` (mirrors seed.sql; used when Supabase isn't connected) |

## How the store decides what can be bought

A product can be added to the bag only when **all** of these are true. This is enforced again on the server at checkout.

1. Store mode is **Live** (Admin → Launch).
2. Product status is **Available**.
3. It has a price.
4. The chosen size has stock.

Checkout additionally needs Square connected (`SQUARE_ACCESS_TOKEN`) and at least one shipping zone switched on. With a production Square token, the store opens for sale by itself on the next deploy (`src/data/launch.ts`: 150 per size, contact email, shipping on, live), once. The bag explains to customers why checkout is closed, without exposing any configuration details.

The Drop 001 catalog ships with suggested prices, sizes and fit notes (editable in Admin → Products) and zero stock, so nothing can be bought until you enter real counts. Pieces show "Coming soon" until they're live, and missing composition, care or measurements show a short "coming soon" note. Stock labels come only from real inventory. Payment success is only shown after the server confirms it with Stripe.

## Scripts

```bash
npm run dev        # local development
npm run build      # production build
npm run lint       # ESLint (not run during build)
npm run typecheck  # TypeScript
```
