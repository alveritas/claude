"use client";

import Link from "next/link";
import { BrandName, PriceText } from "@/components/product/bits";
import { ProductGallery } from "@/components/product/ProductGallery";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { SwatchButtons } from "@/components/product/Swatches";
import { useStore } from "@/components/providers/StoreProvider";
import { useUI } from "@/components/providers/UIProvider";
import { CloseIcon } from "@/components/ui/Icons";
import { Overlay } from "@/components/ui/Overlay";
import { colorwayLabel, familyOf, styleName } from "@/lib/shared/colorways";
import { availabilityLabel, productAvailability } from "@/lib/shared/commerce";

export function QuickView() {
  const { quickView, closeQuickView, openQuickView } = useUI();
  const { products, settings } = useStore();
  const product = products.find((p) => p.id === quickView);
  const members = product ? familyOf(product, products) : [];

  return (
    <Overlay open={Boolean(product)} onClose={closeQuickView} label={product ? `Quick view: ${product.name}` : "Quick view"} variant="dialog">
      {product && (
        <div className="relative grid gap-6 p-4 md:grid-cols-[1.1fr_1fr] md:gap-10 md:p-8">
          <button
            type="button"
            className="icon-btn absolute right-1 top-1 z-10 bg-surface/80"
            onClick={closeQuickView}
            aria-label="Close quick view"
          >
            <CloseIcon />
          </button>
          <ProductGallery key={product.id} images={product.images} title={product.name} />
          <div className="flex flex-col gap-6 md:pt-6">
            <div>
              <h2 className="page-title">
                <BrandName name={styleName(product, members)} />
              </h2>
              <div className="mt-3 flex items-baseline gap-4 text-[0.875rem]">
                <PriceText product={product} />
                <span className="muted">{members.length > 1 ? colorwayLabel(product) : product.color}</span>
                {(productAvailability(product, settings) !== "coming_soon" || product.priceCents != null) && (
                  <span className="muted">{availabilityLabel(productAvailability(product, settings))}</span>
                )}
              </div>
            </div>
            {members.length > 1 && (
              <div className="-ml-1 -mt-2">
                <SwatchButtons
                  members={members}
                  currentId={product.id}
                  onPick={(id) => id !== product.id && openQuickView(id)}
                  size="md"
                  hoverPreview={false}
                  label={`Colors of ${styleName(product, members)}`}
                />
              </div>
            )}
            <PurchasePanel key={product.id} product={product} onAdded={closeQuickView} />
            <Link href={`/products/${product.slug}`} onClick={closeQuickView} className="text-link self-start text-[0.8125rem]">
              View full details
            </Link>
          </div>
        </div>
      )}
    </Overlay>
  );
}
