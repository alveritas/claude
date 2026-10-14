import type { NextConfig } from "next";

/**
 * Supabase settings arrive under different names depending on how Supabase was connected:
 * by hand (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY), Vercel's integration (…_PUBLISHABLE_KEY) or
 * Netlify's extension (SUPABASE_ANON_KEY, …). They're resolved once here and passed to the
 * app as NH_SUPABASE_URL / NH_SUPABASE_PUBLIC_KEY. Both are public by design (the browser
 * needs them); the secret key is never passed this way.
 */
const pick = (names: string[], ok: (v: string) => boolean = () => true) =>
  names.map((n) => process.env[n]?.trim() ?? "").find((v) => v && ok(v)) ?? "";
const supabaseUrl = pick(
  ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_DATABASE_URL", "SUPABASE_DATABASE_URL"],
  (v) => /^https:\/\//.test(v),
);
const supabasePublicKey = pick([
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
]);
// Netlify only exposes the site's address (URL) during the build, so it's baked in here.
const netlifyUrl = process.env.NETLIFY === "true" ? (process.env.URL ?? "") : "";

// Product images uploaded through the admin live in Supabase Storage.
// Allow next/image to optimise them once the project URL is configured.
function supabaseHost(): string | null {
  try {
    return supabaseUrl ? new URL(supabaseUrl).hostname : null;
  } catch {
    return null;
  }
}

const host = supabaseHost();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: {
    NH_SUPABASE_URL: supabaseUrl,
    NH_SUPABASE_PUBLIC_KEY: supabasePublicKey,
    NH_NETLIFY_URL: netlifyUrl,
  },
  // Run `npm run lint` yourself; a style warning shouldn't block a deploy.
  eslint: { ignoreDuringBuilds: true },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: host
      ? [{ protocol: "https", hostname: host, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  async headers() {
    // Photos and logo files rarely change; let browsers and the CDN keep them for a week.
    const longCache = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }];
    return [
      { source: "/images/:path*", headers: longCache },
      { source: "/brand/:path*", headers: longCache },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
