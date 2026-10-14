"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { submitReview, type ReviewState } from "@/app/(store)/review/actions";
import { CheckIcon } from "@/components/ui/Icons";
import { FIT_LABELS } from "@/lib/shared/reviews";
import type { ReviewFit } from "@/lib/shared/types";

export interface ReviewPageItem {
  id: string;
  name: string;
  size: string | null;
  colorway: string | null;
  slug: string | null;
  image: string | null;
  reviewed: boolean;
}

const STAR = "M12 2.8l2.75 5.57 6.15.9-4.45 4.34 1.05 6.12L12 16.84l-5.5 2.89 1.05-6.12L3.1 9.27l6.15-.9z";
const WORDS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

function StarInput({ name }: { name: string }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const lit = hover || value;
  return (
    <fieldset>
      <legend className="label mb-2">Your rating</legend>
      <div className="flex items-center gap-4">
        <div className="star-input" role="radiogroup" aria-label="Star rating" onPointerLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} data-on={n <= lit} onPointerEnter={() => setHover(n)}>
              <input
                type="radio"
                name={name}
                value={n}
                className="sr-only"
                checked={value === n}
                onChange={() => setValue(n)}
                aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
              />
              <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
                <path d={STAR} fill="currentColor" />
              </svg>
            </label>
          ))}
        </div>
        <span className="muted text-[0.8125rem]" aria-live="polite">
          {WORDS[lit]}
        </span>
      </div>
    </fieldset>
  );
}

function ReviewItemForm({ orderId, token, item, defaultName }: { orderId: string; token: string; item: ReviewPageItem; defaultName: string }) {
  const [state, action, pending] = useActionState(submitReview, {} as ReviewState);
  const [body, setBody] = useState("");
  const id = useId();
  const done = item.reviewed || Boolean(state.ok);
  return (
    <article className="border-t border-rule py-10">
      <div className="flex items-center gap-5">
        <div className="frame h-24 w-[76px] flex-none">
          {item.image && <Image src={item.image} alt="" fill sizes="76px" className="object-cover" />}
        </div>
        <div>
          <h2 className="card-title">{item.name}</h2>
          <p className="muted mt-1 text-[0.8125rem]">
            {[item.size && `Size ${item.size}`, item.colorway].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {done ? (
        <p className="mt-6 flex items-center gap-2 text-[0.875rem]" role="status">
          <CheckIcon size={16} /> {state.ok ?? "Reviewed. Thank you."}
          {item.slug && (
            <Link href={`/products/${item.slug}#reviews`} className="text-link ml-2">
              See it on the page
            </Link>
          )}
        </p>
      ) : (
        <form action={action} className="mt-8 flex max-w-xl flex-col gap-7">
          <input type="hidden" name="order_id" value={orderId} />
          <input type="hidden" name="t" value={token} />
          <input type="hidden" name="order_item_id" value={item.id} />
          <StarInput name="rating" />
          <fieldset>
            <legend className="label mb-2">How does it fit? (optional)</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FIT_LABELS) as ReviewFit[]).map((k) => (
                <label key={k} className="fit-choice">
                  <input type="radio" name="fit" value={k} className="sr-only" />
                  <span className="size-option">{FIT_LABELS[k]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            <span className="label">Headline (optional)</span>
            <input name="title" maxLength={80} className="field" placeholder="Sum it up in a few words" />
          </label>
          <label>
            <span className="label flex justify-between">
              <span>Your review</span>
              <span className="tabular-nums" aria-hidden="true">
                {body.length}/2000
              </span>
            </span>
            <textarea
              name="body"
              required
              minLength={10}
              maxLength={2000}
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="field resize-y"
              placeholder="The fabric, the fit, how you wear it"
              aria-describedby={`${id}-note`}
            />
          </label>
          <label>
            <span className="label">Name shown with your review</span>
            <input name="author" required maxLength={40} defaultValue={defaultName} className="field" autoComplete="nickname" />
          </label>
          <p id={`${id}-note`} className="muted text-[0.75rem] leading-relaxed">
            Your review shows the name above, the size and color you bought, and a Verified buyer badge. Your email,
            address and order number are never shown.
          </p>
          {state.error && (
            <p role="alert" className="form-error">
              {state.error}
            </p>
          )}
          <button type="submit" className="btn btn-solid self-start" disabled={pending}>
            {pending ? "Posting…" : "Post review"}
          </button>
        </form>
      )}
    </article>
  );
}

export function ReviewOrderView({
  orderId,
  orderNumber,
  token,
  defaultName,
  items,
}: {
  orderId: string;
  orderNumber: string;
  token: string;
  defaultName: string;
  items: ReviewPageItem[];
}) {
  return (
    <div className="shell max-w-3xl pb-24 pt-10 md:pt-16">
      <h1 className="page-title">Review your order</h1>
      <p className="muted mt-3 max-w-[56ch] text-[0.9375rem] leading-relaxed">
        Order {orderNumber}. Tell other buyers how each piece looks, feels and fits. Reviews go live straight away with a
        Verified buyer badge.
      </p>
      <div className="mt-10">
        {items.map((it) => (
          <ReviewItemForm key={it.id} orderId={orderId} token={token} item={it} defaultName={defaultName} />
        ))}
      </div>
    </div>
  );
}

const MESSAGES = {
  invalid: ["This link doesn’t work", "Review links are sent with your order emails. Use the full link from the email, or contact us and we’ll send it again."],
  unavailable: ["Reviews aren’t available right now", "Please try again a little later."],
  test: ["This was a test order", "Test-mode orders can’t be reviewed, so every review on the site is from a real purchase."],
  closed: ["This order can’t be reviewed", "Orders that were refunded or cancelled can’t be reviewed."],
} as const;

export function ReviewMessage({ kind }: { kind: keyof typeof MESSAGES }) {
  const [title, body] = MESSAGES[kind];
  return (
    <div className="shell max-w-3xl pb-24 pt-10 md:pt-16">
      <h1 className="page-title">{title}</h1>
      <p className="muted mt-3 max-w-[56ch] text-[0.9375rem] leading-relaxed">{body}</p>
      <Link href="/shop" className="btn btn-line mt-8">
        Back to the shop
      </Link>
    </div>
  );
}
