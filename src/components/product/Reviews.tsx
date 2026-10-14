"use client";

import { useMemo, useState } from "react";
import { CheckIcon } from "@/components/ui/Icons";
import { average, FIT_LABELS, fitSummary } from "@/lib/shared/reviews";
import type { RatingTally, Review, ReviewFit } from "@/lib/shared/types";

const STAR = "M12 2.8l2.75 5.57 6.15.9-4.45 4.34 1.05 6.12L12 16.84l-5.5 2.89 1.05-6.12L3.1 9.27l6.15-.9z";

function StarRow() {
  return (
    <span className="stars-row" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24">
          <path d={STAR} fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}

/** Five stars filled to `value` (partial stars for averages). */
export function Stars({ value, size = 14, label }: { value: number; size?: number; label?: string }) {
  const pct = (Math.max(0, Math.min(5, value)) / 5) * 100;
  return (
    <span className="stars" role="img" aria-label={label ?? `${value} out of 5 stars`} style={{ ["--star" as string]: `${size}px` }}>
      <span className="stars-base">
        <StarRow />
      </span>
      <span className="stars-fill" style={{ width: `${pct}%` }}>
        <StarRow />
      </span>
    </span>
  );
}

/** Compact "★★★★★ 4.8 (12)" for cards and the product title. Nothing until there are reviews. */
export function RatingLine({ tally, href, size = 11 }: { tally: RatingTally; href?: string; size?: number }) {
  if (!tally.count) return null;
  const avg = average(tally);
  const inner = (
    <>
      <Stars value={avg} size={size} label={`Rated ${avg} out of 5 from ${tally.count} ${tally.count === 1 ? "review" : "reviews"}`} />
      <span className="muted text-[0.75rem] tabular-nums" aria-hidden="true">
        {avg.toFixed(1)} ({tally.count})
      </span>
    </>
  );
  return href ? (
    <a href={href} className="inline-flex items-center gap-2 hover:opacity-70">
      {inner}
    </a>
  ) : (
    <span className="inline-flex items-center gap-2">{inner}</span>
  );
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

type Sort = "recent" | "high" | "low";

/**
 * Product page reviews. Every review comes from a verified buyer via their order link; nothing
 * here is written by the store. Shown once the store is live, or whenever reviews exist.
 */
export function ReviewsSection({ reviews, tally, live }: { reviews: Review[]; tally: RatingTally; live: boolean }) {
  const [shown, setShown] = useState(5);
  const [sort, setSort] = useState<Sort>("recent");
  const sorted = useMemo(() => {
    const list = [...reviews];
    if (sort === "high") list.sort((a, b) => b.rating - a.rating || b.createdAt.localeCompare(a.createdAt));
    if (sort === "low") list.sort((a, b) => a.rating - b.rating || b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [reviews, sort]);
  if (!reviews.length && !live) return null;

  const count = tally.count || reviews.length;
  const avg = tally.count ? average(tally) : 0;
  const byStar = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));
  const fit = fitSummary(tally);
  const answered = tally.fit.small + tally.fit.true + tally.fit.large;

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="shell mt-24 scroll-mt-[calc(var(--top-h)+24px)] md:mt-32">
      <div className="grid gap-10 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:gap-20">
        <div>
          <h2 id="reviews-title" className="section-title">
            Reviews
          </h2>
          {count ? (
            <>
              <div className="mt-6 flex items-end gap-4">
                <span className="text-[2.75rem] font-light leading-none tabular-nums">{avg.toFixed(1)}</span>
                <span className="pb-1.5">
                  <Stars value={avg} size={16} />
                </span>
              </div>
              <p className="muted mt-2 text-[0.8125rem]">
                {count} {count === 1 ? "review" : "reviews"} from verified buyers
              </p>
              <ul className="mt-6 flex flex-col gap-2" aria-label="Ratings breakdown">
                {byStar.map(({ n, c }) => (
                  <li key={n} className="flex items-center gap-3 text-[0.75rem]">
                    <span className="muted w-10 tabular-nums">{n} star</span>
                    <span className="rating-bar" aria-hidden="true">
                      <span style={{ width: `${reviews.length ? (c / reviews.length) * 100 : 0}%` }} />
                    </span>
                    <span className="muted w-6 text-right tabular-nums">{c}</span>
                  </li>
                ))}
              </ul>
              {fit && (
                <div className="mt-8">
                  <p className="text-[0.75rem] uppercase tracking-[0.12em]">
                    Fit<span className="muted">: {fit}</span>
                  </p>
                  <div className="fit-meter mt-3" aria-hidden="true">
                    {(["small", "true", "large"] as ReviewFit[]).map((k) => (
                      <span key={k} style={{ flexGrow: Math.max(tally.fit[k], 0.0001) }} data-k={k} />
                    ))}
                  </div>
                  <div className="muted mt-2 flex justify-between text-[0.6875rem]">
                    {(["small", "true", "large"] as ReviewFit[]).map((k) => (
                      <span key={k}>
                        {FIT_LABELS[k]} {answered ? Math.round((tally.fit[k] / answered) * 100) : 0}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="muted mt-5 max-w-[36ch] text-[0.875rem] leading-relaxed">
              No reviews yet. Every review on NEVERHOLLOW comes from a verified buyer: customers get a review link with their
              order and can review what they bought.
            </p>
          )}
        </div>

        {count > 0 && (
          <div>
            <div className="flex items-center justify-between gap-4 border-b border-rule pb-4">
              <p className="muted text-[0.8125rem]">
                Showing {Math.min(shown, sorted.length)} of {sorted.length}
              </p>
              <label className="flex items-center gap-3 text-[0.8125rem]">
                <span className="muted">Sort</span>
                <select className="select text-[0.8125rem]" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="recent">Most recent</option>
                  <option value="high">Highest rated</option>
                  <option value="low">Lowest rated</option>
                </select>
              </label>
            </div>
            <ul>
              {sorted.slice(0, shown).map((r) => (
                <li key={r.id} className="review border-b border-rule py-7">
                  <div className="flex items-center justify-between gap-4">
                    <Stars value={r.rating} size={13} label={`Rated ${r.rating} out of 5`} />
                    <time className="muted text-[0.75rem]" dateTime={r.createdAt}>
                      {formatDate(r.createdAt)}
                    </time>
                  </div>
                  {r.title && <h3 className="mt-3 text-[0.9375rem] font-medium">{r.title}</h3>}
                  <p className="mt-2 max-w-[68ch] whitespace-pre-line text-[0.875rem] leading-relaxed">{r.body}</p>
                  <p className="muted mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem]">
                    <span className="text-bone">{r.author}</span>
                    <span className="inline-flex items-center gap-1">
                      <CheckIcon size={12} /> Verified buyer
                    </span>
                    {r.size && <span>· Size {r.size}</span>}
                    {r.color && <span>· {r.color}</span>}
                    {r.fit && <span>· {FIT_LABELS[r.fit]}</span>}
                  </p>
                </li>
              ))}
            </ul>
            {sorted.length > shown && (
              <button type="button" className="btn btn-line mt-8" onClick={() => setShown((n) => n + 10)}>
                Show more reviews
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
