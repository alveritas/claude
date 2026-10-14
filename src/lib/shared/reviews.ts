import type { Review, ReviewFit, RatingTally } from "./types";

export const FIT_LABELS: Record<ReviewFit, string> = {
  small: "Runs small",
  true: "True to size",
  large: "Runs large",
};

/** The only reasons a review can be hidden. Being critical isn't one of them. */
export const HIDE_REASONS = ["Abusive or offensive", "Shares personal information", "Not about the product", "Spam"] as const;

export const emptyTally = (): RatingTally => ({ count: 0, sum: 0, fit: { small: 0, true: 0, large: 0 } });

/** Adds up several tallies (e.g. every colour of one piece). */
export function combineTallies(tallies: (RatingTally | undefined)[]): RatingTally {
  const out = emptyTally();
  for (const t of tallies) {
    if (!t) continue;
    out.count += t.count;
    out.sum += t.sum;
    (Object.keys(out.fit) as ReviewFit[]).forEach((k) => (out.fit[k] += t.fit[k]));
  }
  return out;
}

export function tallyReviews(rows: { product_id: string | null; rating: number; fit: string | null }[]): Record<string, RatingTally> {
  const out: Record<string, RatingTally> = {};
  for (const r of rows) {
    if (!r.product_id) continue;
    const t = (out[r.product_id] ??= emptyTally());
    t.count += 1;
    t.sum += r.rating;
    if (r.fit === "small" || r.fit === "true" || r.fit === "large") t.fit[r.fit] += 1;
  }
  return out;
}

/** Average to one decimal, e.g. 4.7. */
export const average = (t: RatingTally) => (t.count ? Math.round((t.sum / t.count) * 10) / 10 : 0);

/** "Most say true to size", only once at least three buyers have answered. */
export function fitSummary(t: RatingTally): string | null {
  const answered = t.fit.small + t.fit.true + t.fit.large;
  if (answered < 3) return null;
  const [top, n] = (Object.entries(t.fit) as [ReviewFit, number][]).sort((a, b) => b[1] - a[1])[0];
  if (n / answered < 0.5) return "Buyers are split on fit";
  return `Most say ${FIT_LABELS[top].toLowerCase()}`;
}

export function mapReview(row: {
  id: string;
  product_id: string;
  rating: number;
  title: string | null;
  body: string;
  author: string;
  size: string | null;
  color: string | null;
  fit: string | null;
  created_at: string;
}): Review {
  return {
    id: row.id,
    productId: row.product_id,
    rating: row.rating,
    title: row.title ?? null,
    body: row.body,
    author: row.author,
    size: row.size ?? null,
    color: row.color ?? null,
    fit: row.fit === "small" || row.fit === "true" || row.fit === "large" ? row.fit : null,
    createdAt: row.created_at,
  };
}

export interface ReviewInput {
  rating: number;
  title: string | null;
  body: string;
  author: string;
  fit: ReviewFit | null;
}

/** Checks what a buyer typed. Returns the cleaned review or the first problem, in plain words. */
export function parseReviewInput(fd: { get(k: string): unknown }): { ok: ReviewInput } | { error: string } {
  const s = (k: string) => String(fd.get(k) ?? "").replace(/\s+/g, " ").trim();
  const rating = Number(s("rating"));
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choose a star rating." };
  const body = String(fd.get("body") ?? "").trim().replace(/\n{3,}/g, "\n\n");
  if (body.length < 10) return { error: "Write a little more about the piece (at least 10 characters)." };
  if (body.length > 2000) return { error: "Keep the review under 2,000 characters." };
  const title = s("title").slice(0, 80) || null;
  const author = s("author");
  if (!author) return { error: "Add the name to show with your review." };
  if (author.length > 40) return { error: "Keep the name under 40 characters." };
  const fitRaw = s("fit");
  const fit = fitRaw === "small" || fitRaw === "true" || fitRaw === "large" ? fitRaw : null;
  return { ok: { rating, title, body, author, fit } };
}

/** "Jordan Lee" → "Jordan L.", the default name shown with a review. */
export function shortName(fullName: string | null | undefined): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return parts.length === 1 ? parts[0].slice(0, 40) : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`.slice(0, 40);
}
