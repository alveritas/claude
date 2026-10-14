# NEVERHOLLOW — go-live guide

Payments run on **PayPal**, paid to **stillmysaint@gmail.com** (set in `src/data/launch.ts`; `PAYPAL_EMAIL` in Netlify overrides it). Customers pay on PayPal's secure page with a debit or credit card or their PayPal account. There are no keys to set up.

> The database SQL has been run on PostgreSQL 16 with 52 permission checks, and the checkout, PayPal, Square, order-recording, launch, reviews and admin code has 156 automated tests run against simulated payment companies and database.

---

## How it went live

The site deploys from GitHub (`alveritas/claude`, branch `main`) on Netlify: every push goes live by itself. On the first deploy with PayPal, the store opened for sale by itself, once:
- every size of every piece stocked at **150**;
- contact email **neverhollowonline@gmail.com**;
- shipping on: **United States $8, free over $200**, **everywhere else $35** (Admin → Shipping);
- the store live with the announcement "Drop 001 is out now".

Anything you change in the admin afterwards stays as you set it.

**How a sale works:** the buyer pays on PayPal's page; PayPal emails you the payment with the shipping address; the site checks the payment back with PayPal, compares the amount with your prices, records the order (Admin → Orders) and lowers stock. If an amount doesn't match (someone tampered with the checkout), the order shows a red "Don't ship" note.

**Good to know:**
- If PayPal asks you to upgrade to a free **Business** account when the first payment comes in, say yes: that's what lets buyers pay by card without a PayPal account.
- Refunds: PayPal → Activity → the payment → Issue a refund. The order turns Refunded by itself.
- **Sales tax** isn't added at checkout. Ask an accountant whether you need to collect it where you're based.
- Optional: Square instead of PayPal (card, Apple Pay, Google Pay, Cash App Pay) — add `SQUARE_ACCESS_TOKEN` in Netlify and redeploy; Square is used whenever that's set.

**Where orders are:** Admin → Orders on your site, and your PayPal account (Activity), which also emails you each payment with the buyer's address. If the site isn't connected to its database, PayPal still takes and keeps every payment.

**Stripe** is no longer used. If `STRIPE_SECRET_KEY` is still set in Netlify you can delete it.

**After launch**
- When you ship an order, set it to **Shipped** in Admin → Orders with the tracking link: the customer gets the tracking email with their personal review link. (Without email set up, copy the review link shown on the order and send it yourself.)
- Add the site to **Google Search Console** and submit `https://neverhollow.online/sitemap.xml`.

### Reviews
Reviews can only be written from the private link each buyer gets for their order, so every one carries a **Verified buyer** badge, the size and colour bought and how it fit. They go live straight away and appear on the product page, on the shop cards (stars), and in Google results once a piece has some. Under Admin → **Reviews** you can hide one that's abusive, shares personal details, is spam or isn't about the product. Hiding honest negative reviews isn't allowed under the FTC's rules on reviews, so that isn't offered. Test-mode orders can't be reviewed. The store never writes reviews itself.

### FAQ
`/info/faq` answers shipping, duties, returns, sizing, payment, tracking and "are the reviews real?" straight from your settings, so it stays correct when you change a rate or the dispatch time. Add your own questions under Admin → Content → Extra FAQ questions.

### Domain details (done once)

1. In **GitHub Desktop**, every later update is the same: unzip over the folder, **Commit to main**, **Push origin**.
2. In Netlify → **Domain management**, make sure `neverhollow.online` is the **primary domain** (⋯ next to it → Set as primary domain) and that HTTPS shows a certificate. `www.neverhollow.online` should redirect to it, which Netlify does automatically once both are added.
3. The old `soft-lolly-fd0cd8.netlify.app` address now permanently redirects to neverhollow.online, so Google only indexes the real domain.
4. In Supabase → **Authentication → URL Configuration**, Site URL should be `https://neverhollow.online` with `https://neverhollow.online/auth/callback` under Redirect URLs.
5. If you pressed **Connect order webhook** while the site was still on the Netlify address, Admin → Payments now says Stripe is sending orders to the old address. Press **Connect order webhook** once: it moves the webhook to neverhollow.online and removes the old one.
6. Optional but worth it: add the site to **Google Search Console** (Domain property, verify with the TXT record it gives you in Netlify DNS) and submit `https://neverhollow.online/sitemap.xml`.

If you ever move to a different domain, change `PRODUCTION_URL` in `src/lib/shared/site.ts` (or set `NEXT_PUBLIC_SITE_URL` in the host's environment variables).

## The short route (about 30 minutes)

You only make three accounts (GitHub, Vercel, Stripe) and copy one key. Supabase is added from inside Vercel, fills in its own settings, and the site creates its database tables itself during the build.

### 1. Put the code on GitHub
Make a free github.com account and install **GitHub Desktop**. Unzip the project, choose **File → Add local repository**, pick the `neverhollow` folder, accept the offer to create a repository, then **Publish repository** with "Keep this code private" ticked.

### 2. Deploy on Vercel
Sign up at vercel.com with **Continue with GitHub** → **Add New → Project** → import `neverhollow`. Before pressing Deploy, open **Environment Variables** and add two:

| Name | Value |
|---|---|
| `ADMIN_EMAIL` | your email address |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → test Secret key (`sk_test_…`) |

Press **Deploy**. The site goes live on a `….vercel.app` address in prelaunch mode. If the build fails, copy the error into the chat.

### 3. Add the database (inside Vercel)
In the project, open **Storage → Create Database → Supabase**, create it and connect it to this project. Then **Deployments → ⋯ → Redeploy**. During this build the site creates its tables, products, sizes, prices and suggested shipping zones. (Supabase is billed through your Vercel account, and has a free plan.)

### 4. Add your domain
**Settings → Domains**: buy a domain there (it connects itself) or add one you bought elsewhere and copy the records Vercel shows into your registrar's DNS. Then open Supabase from **Storage → Open in Supabase** → **Authentication → URL Configuration**, set **Site URL** to `https://yourdomain.com` and add `https://yourdomain.com/auth/callback` under Redirect URLs, so account emails link back to your site.

### 5. Sign up, then release from the admin
On your site, create an account at `/account/register` with the `ADMIN_EMAIL` address and confirm it from the email. Open `/admin`; you're the admin. Then:

- **Launch**: add your contact email.
- **Payments**: press **Connect order webhook** (once your domain works). This also switches on Apple Pay and Cash App Pay.
- **Products**: enter stock per size and the fabric/origin line for each piece.
- **Shipping**: check the two suggested zones (US $8, free over $200; worldwide $35), tick Active, set your dispatch time.
- **Content**: read the Shipping, Returns, Privacy and Terms pages and adjust anything that doesn't match how you work.
- **Launch → Release now**, then buy something with test card `4242 4242 4242 4242`.
- Finish activating Stripe (ID, bank) until Payments shows "Can take payments: Yes". In Vercel, replace `STRIPE_SECRET_KEY` with the live key (`sk_live_…`), redeploy, and press **Connect order webhook** again. You're selling.

## Accounts, email sign-ups and Cash App (needs the database)

Shopper accounts, "Join the list" sign-ups and Cash App orders are kept in a free Supabase database. Until it's connected, the store still sells by card and PayPal.

1. At supabase.com create a free project and save its database password. Press **Connect**, choose the **Session pooler** connection string and put your password where it says `[YOUR-PASSWORD]`.
2. In Supabase → **Authentication → Sign In / Providers → Email**, switch **Confirm email** off (Supabase's built-in email only reaches your own team, so shoppers couldn't confirm). Under **URL Configuration** set Site URL to `https://neverhollow.online` and add `https://neverhollow.online/auth/callback`.
3. In Netlify → **Site configuration → Environment variables**, add `DATABASE_URL` (the connection string), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API keys; the legacy anon and service_role keys work). Then **Deploys → Trigger deploy**. The build creates the tables itself.
4. Create your own account on the site, then add `ADMIN_EMAIL` with that email and redeploy. (Doing it in this order means nobody else can claim the admin address.)
5. **Cash App:** add `CASHAPP_TAG` (for example `$neverhollow`) and redeploy. US shoppers then see Cash App at checkout. Their orders wait under **Admin → Orders** as "Awaiting payment". Mark one **Paid** only once the money shows in your Cash App with its order number in the note; that takes the stock and sends the confirmation. Cash App asks sellers to use a Cash App for Business account.

## Deploying on Netlify instead of Vercel

Everything works the same on Netlify: the project includes `netlify.toml`, Netlify's Next.js adapter is applied automatically, and the site still creates its own database tables during each build. The difference is that Supabase is created at supabase.com rather than inside the host, so you copy one connection string.

1. **GitHub**: same as step 1 above.
2. **Supabase**: at supabase.com create a project and save the database password it asks for. Press **Connect** at the top of the project, choose the **Session pooler** connection string, copy it and put your password where it says `[YOUR-PASSWORD]`.
3. **Netlify**: sign up at netlify.com with GitHub → **Add new project → Import an existing project → GitHub** → pick `neverhollow`. The build settings fill themselves in from `netlify.toml`. Under **Environment variables** add:

| Name | Value |
|---|---|
| `ADMIN_EMAIL` | your email address |
| `STRIPE_SECRET_KEY` | Stripe test Secret key (`sk_test_…`) |
| `DATABASE_URL` | the Supabase connection string from step 2 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon / publishable key from the same page |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role / secret key (private) |

   Instead of the last three you can install Netlify's **Supabase extension** (Extensions → Supabase → connect your project, framework Next.js); the site reads the names it sets. Then deploy.
4. **Domain**: **Domain management → Add a domain** (buy it through Netlify or add one you own and follow the DNS steps). Then **Deploys → Trigger deploy** once, so the site picks up its new address. Set Supabase's Site URL as in step 4 above.
5. **Admin**: same as step 5 above. Press **Connect order webhook** only after the domain works and you've redeployed.

## The manual route (if you'd rather not use Vercel's Supabase integration)

Create a project at supabase.com, run `supabase/migrations/0001_init.sql` then `supabase/seed.sql` in its SQL Editor, and add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or the publishable key) and `SUPABASE_SERVICE_ROLE_KEY` (or the secret key) to Vercel yourself. Everything else is the same.

## Optional: branded order emails (Resend)

Create an account at resend.com, verify your domain, then add `RESEND_API_KEY` and `EMAIL_FROM` (for example `NEVERHOLLOW <orders@yourdomain.com>`) in Vercel and redeploy. Order confirmations then come from your domain, and marking an order **Shipped** in the admin emails the tracking link.

## Running it on your own computer (optional)

```bash
npm install
cp .env.example .env.local   # fill in the same values as Vercel
npm run dev
```

With no keys at all, the site runs from the built-in Drop 001 catalogue in prelaunch mode. For webhooks on your computer use `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and put the secret it prints in `STRIPE_WEBHOOK_SECRET`.

## Things to decide with an adviser

- **Sales tax and VAT.** Stripe Tax can calculate and collect it (Payments → Calculate tax automatically), once your registrations are added in Stripe. Whether and where you need to register depends on your sales.
- **Policies.** The final-sale policy keeps the legal right to cancel that UK/EU (and some other) customers have for online orders; that right can't be removed by a store policy.
- **Countries left out of "everywhere else":** Russia and Belarus (sanctions and carrier suspensions) and uninhabited territories. Add any of them as a named zone if you can ship there.

---

## Names, prices and sizes

Each piece has a name of its own, and the colourways share one palette: **Obsidian** (black), **Bone** (white) and **Fawn** (brown).

| Piece | Price | Sizes |
|---|---|---|
| Vow Waffle Long Sleeve | $95 | XS–XXL |
| Hush Tee Obsidian / Bone | $70 | XS–XXL |
| Vigil Fur Zip Hoodie Obsidian / Fawn | $185 | XS–XXL |
| Drift Track Pants Bone / Obsidian | $120 | XS–XXL |
| Haven Slides Bone / Obsidian | $75 | US 6–7, 8–9, 10–11, 12–13 |

**Colors show as one item.** In the shop, on the homepage, in search and in the wishlist, each piece appears once (Hush Tee, Vigil Fur Zip Hoodie…) with color dots that switch the photo, price and sizes in place. The product page has a photo tile per color; picking one swaps the page to that color and keeps the size you chose. Behind the scenes each color is still its own product in Admin → Products, with its own photos, stock and web address, so stock counts and orders stay exact (the bag and order emails say "Hush Tee Bone, M"). To add a color to a piece, create a product with the **same name and category, ending in its color word** (for example Hush Tee Olive). The products list in the admin notes which ones are grouped. Google receives each piece as one product group with its colors as variants.

These are suggested starting values, priced for independent premium streetwear. Change any of them in Admin → Products. The slides come in paired sizes because pile slides usually do; if your manufacturer makes single sizes, edit the size list. The fit notes only describe what the photos show (oversized, boxy, wide-leg). Measurements, fabric and care are left empty until you have them from your manufacturer; until then the size guide says measurements are coming. While the store is in prelaunch, every piece shows its price with a **Coming soon** label and a Notify me form instead of Add to bag.

## Images

Every product now uses your studio photos at full size (about 1,000–1,200 px wide). For sharper zoom, upload higher-resolution exports in Admin → Products. Each image has a view name, alt text, framing (crop or show whole) and a focal point.

Gaps in the current photo set:

- **Vow Waffle Long Sleeve**: uses your studio photos (1122 × 1402): front and back on model, front and back flat, and the NH label. It still has no side view or fabric close-up.
- **Hush Tee Obsidian** and **Hush Tee Bone**: two separate products under Tops (front and back on model, plus a flat).
- **Vigil Fur Zip Hoodie Obsidian** and **Vigil Fur Zip Hoodie Fawn**: two separate products, each with your studio photos (front on model, angled or open on model, front flat). Each has its own price, sizes and stock in the admin. Neither has a back view yet.
- **Drift Track Pants Bone** and **Drift Track Pants Obsidian**: two separate products (front and back on model, plus a flat). They replace the Cotton Sweatpants from the brief. The flats were extended to the site's 4:5 frame with matching white, so nothing is cropped.
- **Haven Slides Bone** and **Haven Slides Obsidian**: two separate products in the new Footwear category (pair from above, plus a side view). The Washed Denim and the Denim category were removed. The side views were extended to the 4:5 frame with matching white.

The homepage cover uses `public/images/hero/cover.webp`: your two-model photo cut out to a transparent background, so the figures stand on the off-white page and fade under the wordmark. To change it, upload a transparent PNG or WebP cut-out (to `public/images/hero/` or Supabase Storage) and set the cover photo path and description in Admin → Content. A photo with a solid background will show as a box on the page. The spotlight section shows all of the Vow Waffle Long Sleeve's images. The editorial band (NOT MADE TO EXPLAIN.) uses the four transparent hoodie cut-outs in `public/images/editorial/`, softened into the page. Change them under Admin → Content (Editorial photos, one path per line).

## One look: light

The store has a single look: off-white pages (`#f4f3f0`) with near-black type, black buttons and a soft tinted band for the spotlight. There is no dark mode and no switch. Phones and computers set to dark mode still get the light site, and the page tells browsers not to darken it automatically (`color-scheme: only light`). The phone browser bar is tinted to the page colour. Order emails, the favicon, the home-screen icon and the link-preview image (`public/og.jpg`) use the same light look. The colours live at the top of `src/app/globals.css`.

## Logos

`public/brand/cursive-*.png` and `public/brand/nh-*.png` are your original artwork, with the black background converted to transparency and the edges trimmed. Nothing was redrawn. The site uses the artwork's shape as a mask filled with the current text colour, filled near-black on the page. The `-dark` files are kept for uses outside the page itself, such as the logo search engines read. If you have vector (SVG) or native transparent exports, drop them in with the same file names. The favicon and app icons are in `src/app/icon.png`, `apple-icon.png` and `favicon.ico`.
