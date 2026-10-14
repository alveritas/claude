"use client";

import { useStore } from "@/components/providers/StoreProvider";
import { useWishlist } from "@/components/providers/WishlistProvider";
import { HeartIcon } from "@/components/ui/Icons";
import { availabilityLabel, productAvailability } from "@/lib/shared/commerce";
import { formatPrice } from "@/lib/shared/format";
import type { Product } from "@/lib/shared/types";

export function PriceText({ product, className = "" }: { product: Product; className?: string }) {
  const { settings } = useStore();
  return (
    <span className={className}>
      {product.priceCents == null ? "Coming soon" : formatPrice(product.priceCents, settings.currency)}
    </span>
  );
}

export function AvailabilityText({ product, className = "" }: { product: Product; className?: string }) {
  const { settings } = useStore();
  const a = productAvailability(product, settings);
  return <span className={className}>{a === "coming_soon" ? "Drop 001" : availabilityLabel(a)}</span>;
}

export function WishlistButton({
  product,
  className = "",
  withLabel = false,
}: {
  product: Product;
  className?: string;
  withLabel?: boolean;
}) {
  const { has, toggle } = useWishlist();
  const saved = has(product.id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(product.id, product.name);
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      className={withLabel ? `btn btn-line ${className}` : `icon-btn ${className}`}
    >
      <HeartIcon filled={saved} size={withLabel ? 16 : 18} />
      {withLabel && <span>{saved ? "Saved" : "Save to wishlist"}</span>}
    </button>
  );
}

export function BrandName({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={className}>
      <span className="sr-only">NEVERHOLLOW </span>
      {name}
    </span>
  );
}
