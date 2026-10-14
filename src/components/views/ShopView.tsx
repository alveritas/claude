"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { useStore } from "@/components/providers/StoreProvider";
import { CloseIcon, FilterIcon, SearchIcon } from "@/components/ui/Icons";
import { groupFamilies } from "@/lib/shared/colorways";
import { Overlay } from "@/components/ui/Overlay";
import {
  applyFilters,
  AVAILABILITY_FILTERS,
  filterOptions,
  filtersToParams,
  PAGE_SIZE,
  parseFilters,
  SORTS,
  type AvailabilityFilter,
  type ShopFilters,
  type SortKey,
} from "@/lib/shared/filters";
import { CATEGORIES, CATEGORY_LABELS, type Collection } from "@/lib/shared/types";

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function ShopView({ collection }: { collection?: Collection }) {
  const { products, settings } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filterOpen, setFilterOpen] = useState(false);

  const filters = useMemo(() => {
    const f = parseFilters(new URLSearchParams(params.toString()));
    return collection ? { ...f, collection: collection.id } : f;
  }, [params, collection]);

  const [q, setQ] = useState(filters.q);
  useEffect(() => setQ(filters.q), [filters.q]);

  const scope = useMemo(
    () => (collection ? products.filter((p) => p.collectionId === collection.id) : products),
    [products, collection],
  );
  const options = useMemo(() => filterOptions(scope), [scope]);
  // Only categories with pieces get a tab (plus the one in the URL), so empty ones never show.
  const visibleCats = useMemo(
    () => CATEGORIES.filter((c) => c === filters.category || scope.some((p) => p.category === c)),
    [scope, filters.category],
  );
  // One card per piece: colours of the same piece share a card, led by the first colour that
  // matches the filters (so filtering by "Washed White" opens the tee in white).
  const results = useMemo(() => groupFamilies(applyFilters(scope, filters, settings), scope), [scope, filters, settings]);
  const visible = results.slice(0, filters.page * PAGE_SIZE);

  const update = (patch: Partial<ShopFilters>) => {
    const next: ShopFilters = { ...filters, page: 1, ...patch };
    if (collection) next.collection = null; // the collection lives in the path, not the query
    const qs = filtersToParams(next).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Debounced search-as-you-type.
  useEffect(() => {
    if (q === filters.q) return;
    const t = window.setTimeout(() => update({ q: q.trim() }), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeCount = filters.sizes.length + filters.colors.length + filters.availability.length;
  const chips: { label: string; clear: () => void }[] = [
    ...filters.sizes.map((s) => ({ label: `Size ${s}`, clear: () => update({ sizes: toggle(filters.sizes, s) }) })),
    ...filters.colors.map((c) => ({ label: c, clear: () => update({ colors: toggle(filters.colors, c) }) })),
    ...filters.availability.map((a) => ({
      label: AVAILABILITY_FILTERS[a],
      clear: () => update({ availability: toggle(filters.availability, a) }),
    })),
    ...(filters.q ? [{ label: `“${filters.q}”`, clear: () => update({ q: "" }) }] : []),
  ];
  const clearAll = () => update({ sizes: [], colors: [], availability: [], q: "", category: "all" });

  return (
    <div className="shell pb-24 pt-8 md:pt-12">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">
            {collection ? collection.name : filters.category !== "all" ? CATEGORY_LABELS[filters.category] : "All products"}
          </h1>
          {collection?.description && <p className="muted mt-3">{collection.description}</p>}
        </div>
        <p className="muted text-[0.8125rem]" aria-live="polite">
          {results.length} {results.length === 1 ? "piece" : "pieces"}
        </p>
      </div>

      {/* Categories */}
      <nav aria-label="Categories" className="no-scrollbar -mx-4 mt-6 flex gap-7 overflow-x-auto border-b border-rule px-4 md:mx-0 md:px-0">
        {(["all", ...visibleCats] as const).map((c) => (
          <button
            key={c}
            type="button"
            className="tab"
            aria-current={filters.category === c}
            onClick={() => update({ category: c })}
          >
            {c === "all" ? "All" : CATEGORY_LABELS[c]}
          </button>
        ))}
      </nav>

      {/* Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
        <button type="button" className="chip" onClick={() => setFilterOpen(true)} aria-haspopup="dialog">
          <FilterIcon size={16} />
          Filter{activeCount ? ` (${activeCount})` : ""}
        </button>
        <label className="flex min-w-[200px] flex-1 items-center gap-2 border-b border-rule focus-within:border-bone md:max-w-xs">
          <SearchIcon size={16} className="text-silver" />
          <span className="sr-only">Search products</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent py-2 text-[0.875rem] outline-none placeholder:text-[var(--placeholder)]"
          />
        </label>
        <label className="ml-auto flex items-center gap-3 text-[0.8125rem]">
          <span className="muted">Sort</span>
          <select
            className="select text-[0.8125rem]"
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value as SortKey })}
          >
            {Object.entries(SORTS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {chips.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button key={c.label} type="button" className="chip" onClick={c.clear} aria-label={`Remove filter ${c.label}`}>
              {c.label}
              <CloseIcon size={12} />
            </button>
          ))}
          <button type="button" className="text-link muted ml-2 text-[0.75rem]" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      {/* Grid */}
      {visible.length ? (
        <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((f, i) => {
            // Two columns below desktop: with an odd count the first piece spans the row, so the
            // last one never sits alone.
            const wide = i === 0 && visible.length % 2 === 1 && visible.length > 1;
            return (
              <div key={`${f.key}:${f.lead.id}`} className={wide ? "max-lg:col-span-2" : undefined}>
                <ProductCard
                  product={f.lead}
                  members={f.members}
                  priority={i < 4}
                  sizes={wide ? "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 100vw" : "(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw"}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-16 flex flex-col items-start gap-5">
          <p className="text-[1.125rem] font-light">
            {scope.length === 0
              ? "No pieces have been added yet."
              : filters.category !== "all" && !activeCount && !filters.q
                ? `No ${CATEGORY_LABELS[filters.category].toLowerCase()} yet.`
                : "No pieces match these filters."}
          </p>
          {scope.length > 0 && (
            <button type="button" className="btn btn-line" onClick={clearAll}>
              Show all pieces
            </button>
          )}
        </div>
      )}

      {results.length > visible.length && (
        <div className="mt-14 flex flex-col items-center gap-3">
          <p className="muted text-[0.75rem]">
            Showing {visible.length} of {results.length}
          </p>
          <button type="button" className="btn btn-line" onClick={() => update({ page: filters.page + 1 })}>
            Load more
          </button>
        </div>
      )}

      <Overlay open={filterOpen} onClose={() => setFilterOpen(false)} label="Filters" variant="drawer">
        <div className="flex h-[var(--hdr-h)] flex-none items-center justify-between border-b border-rule px-5">
          <h2 className="caps">Filter</h2>
          <button type="button" className="icon-btn -mr-3" onClick={() => setFilterOpen(false)} aria-label="Close filters">
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <fieldset className="border-b border-rule pb-6">
            <legend className="mb-4 text-[0.8125rem]">Size</legend>
            {options.sizes.length ? (
              <div className="flex flex-wrap gap-2">
                {options.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="checkbox"
                    aria-checked={filters.sizes.includes(s)}
                    className="size-option"
                    onClick={() => update({ sizes: toggle(filters.sizes, s) })}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted text-[0.8125rem]">Sizes are added when each piece is ready for release.</p>
            )}
          </fieldset>
          <fieldset className="border-b border-rule py-6">
            <legend className="mb-4 pt-6 text-[0.8125rem]">Color</legend>
            <div className="flex flex-col gap-3">
              {options.colors.map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-3 text-[0.875rem]">
                  <input
                    type="checkbox"
                    className="check mt-0"
                    checked={filters.colors.includes(c)}
                    onChange={() => update({ colors: toggle(filters.colors, c) })}
                  />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="py-6">
            <legend className="mb-4 pt-6 text-[0.8125rem]">Availability</legend>
            <div className="flex flex-col gap-3">
              {(Object.keys(AVAILABILITY_FILTERS) as AvailabilityFilter[]).map((a) => (
                <label key={a} className="flex cursor-pointer items-center gap-3 text-[0.875rem]">
                  <input
                    type="checkbox"
                    className="check mt-0"
                    checked={filters.availability.includes(a)}
                    onChange={() => update({ availability: toggle(filters.availability, a) })}
                  />
                  {AVAILABILITY_FILTERS[a]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="flex flex-none gap-3 border-t border-rule p-5">
          <button
            type="button"
            className="btn btn-line flex-1"
            onClick={() => update({ sizes: [], colors: [], availability: [] })}
          >
            Clear
          </button>
          <button type="button" className="btn btn-solid flex-1" onClick={() => setFilterOpen(false)}>
            Show {results.length}
          </button>
        </div>
      </Overlay>
    </div>
  );
}
