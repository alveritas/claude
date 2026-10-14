/** Server-side environment access. Secret values never leave this module's callers on the server. */
import { PRODUCTION_URL } from "@/lib/shared/site";

function clean(v: string | undefined): string | null {
  const t = v?.trim();
  return t ? t : null;
}

/**
 * Supabase settings are accepted under every naming scheme in use: set by hand, by Vercel's
 * Supabase integration (publishable / secret keys) or by Netlify's Supabase extension. The
 * public URL and key are resolved at build time in next.config.ts (NH_SUPABASE_*).
 */
export const env = {
  supabaseUrl: clean(process.env.NH_SUPABASE_URL) ?? clean(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? clean(process.env.SUPABASE_URL),
  supabaseAnonKey:
    clean(process.env.NH_SUPABASE_PUBLIC_KEY) ??
    clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
    clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  supabaseServiceKey: clean(process.env.SUPABASE_SERVICE_ROLE_KEY) ?? clean(process.env.SUPABASE_SECRET_KEY),
  /** The owner's email: signing up with it (and confirming it) makes that account the admin. */
  adminEmail: clean(process.env.ADMIN_EMAIL)?.toLowerCase() ?? null,
  /** Square: the production (or sandbox) access token from developer.squareup.com → Credentials. */
  squareAccessToken: clean(process.env.SQUARE_ACCESS_TOKEN),
  /** "sandbox" for Square's test environment; anything else means real payments. */
  squareEnvironment: clean(process.env.SQUARE_ENVIRONMENT)?.toLowerCase() === "sandbox" ? ("sandbox" as const) : ("production" as const),
  /** Optional: which Square location takes the payments. Defaults to the account's main one. */
  squareLocationId: clean(process.env.SQUARE_LOCATION_ID),
  /** Optional: a webhook signature key made by hand in Square's Developer Console. */
  squareWebhookKey: clean(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY),
  stripeSecretKey: clean(process.env.STRIPE_SECRET_KEY),
  stripeWebhookSecret: clean(process.env.STRIPE_WEBHOOK_SECRET),
  resendApiKey: clean(process.env.RESEND_API_KEY),
  emailFrom: clean(process.env.EMAIL_FROM),
};

export function siteUrl(): string {
  const explicit = clean(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit.replace(/\/+$/, "");
  // Deployed (Vercel or Netlify): always the real domain, never the hosting subdomain.
  if (process.env.VERCEL || clean(process.env.NH_NETLIFY_URL)) return PRODUCTION_URL;
  const vercel = clean(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (vercel) return `https://${vercel}`;
  // Netlify: the main address (your custom domain once it's added) from the last build.
  const netlify = clean(process.env.NH_NETLIFY_URL);
  if (netlify) return netlify.replace(/\/+$/, "");
  const deployment = clean(process.env.VERCEL_URL);
  if (deployment) return `https://${deployment}`;
  return "http://localhost:3000";
}

export const hasSupabase = () => Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const hasServiceRole = () => Boolean(env.supabaseUrl && env.supabaseServiceKey);
export const hasSquare = () => Boolean(env.squareAccessToken);
export const hasStripe = () => Boolean(env.stripeSecretKey);
export const hasStripeWebhook = () => Boolean(env.stripeWebhookSecret);
export const hasEmail = () => Boolean(env.resendApiKey && env.emailFrom);
