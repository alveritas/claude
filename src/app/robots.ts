import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/server/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api", "/cart", "/checkout", "/auth", "/review"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
