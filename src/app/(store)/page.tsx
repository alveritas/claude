import type { Metadata } from "next";
import { HomeView } from "@/components/views/HomeView";
import { getStoreData } from "@/lib/server/catalog";
import { siteUrl } from "@/lib/server/env";
import { jsonLdString, websiteJsonLd } from "@/lib/shared/seo";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const { settings } = await getStoreData();
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "NEVERHOLLOW",
    url: siteUrl(),
    logo: `${siteUrl()}/brand/nh-dark.png`,
    ...(settings.contactEmail ? { email: settings.contactEmail } : {}),
    sameAs: [settings.instagramUrl, settings.tiktokUrl].filter(Boolean),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString([org, websiteJsonLd(siteUrl())]) }} />
      <HomeView />
    </>
  );
}
