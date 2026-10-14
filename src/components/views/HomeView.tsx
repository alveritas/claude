"use client";

import { Hero } from "@/components/home/Hero";
import { Editorial, FeaturedCollection, Marquee, Newsletter, ShopByCategory, Spotlight } from "@/components/home/Sections";
import { useStore } from "@/components/providers/StoreProvider";
import { groupFamilies } from "@/lib/shared/colorways";

// The fur hood is the drop's statement piece; the long sleeve already leads the grid above.
export const SPOTLIGHT_SLUG = "vigil-fur-zip-hoodie-fawn";

export function HomeView() {
  const { products } = useStore();
  const featured = products.filter((p) => p.featured);
  const spotlight = products.find((p) => p.slug === SPOTLIGHT_SLUG) ?? featured[0] ?? products[0];

  return (
    <>
      <Hero />
      <Marquee />
      <FeaturedCollection families={groupFamilies(featured.length ? featured : products, products).slice(0, featured.length ? 12 : 4)} />
      <ShopByCategory />
      <Editorial />
      {spotlight && <Spotlight product={spotlight} />}
      <Newsletter />
    </>
  );
}
