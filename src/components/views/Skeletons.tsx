import { ProductCardSkeleton } from "@/components/product/ProductCard";

export function ShopSkeleton() {
  return (
    <div className="shell pb-24 pt-10 md:pt-16" aria-busy="true" aria-label="Loading products">
      <div className="skeleton h-12 w-48 md:h-16" />
      <div className="skeleton mt-10 h-8 w-full max-w-xl" />
      <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <div className="shell grid gap-10 pb-24 pt-14 md:grid-cols-2 lg:gap-20" aria-busy="true" aria-label="Loading product">
      <div className="skeleton aspect-[4/5]" />
      <div className="flex flex-col gap-4">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-10 w-3/4" />
        <div className="skeleton h-4 w-32" />
        <div className="skeleton mt-6 h-24 w-full" />
        <div className="skeleton mt-6 h-12 w-full" />
        <div className="skeleton h-12 w-full" />
      </div>
    </div>
  );
}
