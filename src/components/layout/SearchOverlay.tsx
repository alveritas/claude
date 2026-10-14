"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PriceText } from "@/components/product/bits";
import { useStore } from "@/components/providers/StoreProvider";
import { useUI } from "@/components/providers/UIProvider";
import { CloseIcon, SearchIcon } from "@/components/ui/Icons";
import { Overlay } from "@/components/ui/Overlay";
import { colorwayLabel, groupFamilies, styleName } from "@/lib/shared/colorways";
import { matchesQuery } from "@/lib/shared/filters";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/shared/types";

export function SearchOverlay() {
  const { panel, close } = useUI();
  const { products } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  // One row per piece, however many of its colours match.
  const results = useMemo(
    () => (q.trim() ? groupFamilies(products.filter((p) => matchesQuery(p, q)), products).slice(0, 6) : []),
    [q, products],
  );

  const done = () => {
    close();
    setQ("");
  };

  return (
    <Overlay open={panel === "search"} onClose={done} label="Search" variant="fullscreen" className="bg-ink/97 overflow-y-auto">
      <div className="shell pt-6 md:pt-10">
        <div className="flex justify-end">
          <button type="button" className="icon-btn -mr-3" onClick={done} aria-label="Close search">
            <CloseIcon />
          </button>
        </div>
        <form
          role="search"
          className="mx-auto mt-6 max-w-3xl md:mt-16"
          onSubmit={(e) => {
            e.preventDefault();
            const term = q.trim();
            done();
            router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
          }}
        >
          <label htmlFor="site-search" className="label">
            Search the collection
          </label>
          <div className="flex items-center gap-3 border-b border-silver/50 focus-within:border-bone">
            <SearchIcon size={22} className="flex-none text-silver" />
            <input
              id="site-search"
              data-autofocus
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Hoodie, slides, black…"
              autoComplete="off"
              className="w-full bg-transparent py-4 text-2xl font-extralight outline-none placeholder:text-[var(--placeholder)] md:text-4xl"
            />
          </div>
        </form>

        <div className="mx-auto mt-10 max-w-3xl pb-16" aria-live="polite">
          {q.trim() && results.length === 0 && (
            <p className="muted">
              Nothing matches “{q.trim()}”. Try a category such as hoodies or footwear.
            </p>
          )}
          {results.length > 0 && (
            <ul className="divide-y divide-rule border-y border-rule">
              {results.map(({ key, lead: p, members }) => (
                <li key={key}>
                  <Link href={`/products/${p.slug}`} onClick={done} className="flex items-center gap-4 py-4 hover:opacity-80">
                    <span className="frame h-20 w-16 flex-none">
                      {p.images[0] && (
                        <Image
                          src={p.images[0].url}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                          style={{ objectPosition: p.images[0].focal }}
                        />
                      )}
                    </span>
                    <span className="flex-1">
                      <span className="block text-[0.9375rem]">{styleName(p, members)}</span>
                      <span className="muted block text-[0.75rem]">
                        {CATEGORY_LABELS[p.category]}
                        {members.length > 1 ? `, ${members.map(colorwayLabel).join(" / ")}` : p.color ? `, ${p.color}` : ""}
                      </span>
                    </span>
                    <PriceText product={p} className="muted text-[0.8125rem]" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {!q.trim() && (
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => products.some((p) => p.category === c)).map((c) => (
                <Link key={c} href={`/shop?category=${c}`} onClick={done} className="chip">
                  {CATEGORY_LABELS[c]}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}
