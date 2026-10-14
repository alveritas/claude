import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import type { ReactNode } from "react";
import { siteUrl } from "@/lib/server/env";
import { INTRO_SCRIPT } from "@/lib/shared/intro";
import { PAGE_COLOR } from "@/lib/shared/theme";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const description =
  "NEVERHOLLOW is an independent unisex streetwear label built around silhouette, detail and restraint. Drop 001: oversized long sleeves, tees, fur-hood zip hoodies, track pants and slides.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "NEVERHOLLOW", template: "%s — NEVERHOLLOW" },
  description,
  applicationName: "NEVERHOLLOW",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "NEVERHOLLOW",
    title: "NEVERHOLLOW",
    description,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "NEVERHOLLOW — Drop 001" }],
  },
  twitter: { card: "summary_large_image", title: "NEVERHOLLOW", description, images: ["/og.jpg"] },
};

export const viewport: Viewport = {
  // One look everywhere: the browser bar matches the page, and "only light" asks phones not to
  // auto-darken the site when the device is in dark mode.
  themeColor: PAGE_COLOR,
  colorScheme: "only light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // data-intro is set by an inline script before hydration, hence suppressHydrationWarning.
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
        {/* The logos are CSS masks (fetched in CORS mode, hence crossOrigin); load them with the page so the mark never pops in. */}
        <link rel="preload" as="image" href="/brand/cursive-mask.webp" crossOrigin="anonymous" />
        <link rel="preload" as="image" href="/brand/nh-mask.webp" crossOrigin="anonymous" media="(max-width: 1023.98px)" />
      </head>
      <body>{children}</body>
    </html>
  );
}
