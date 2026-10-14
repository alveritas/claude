"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { EmptyBag } from "@/components/cart/CartContents";
import { useCart } from "@/components/providers/CartProvider";
import { useStore } from "@/components/providers/StoreProvider";
import { LockIcon } from "@/components/ui/Icons";
import { startCheckout } from "@/lib/client/api";
import { readJSON, writeJSON } from "@/lib/client/storage";
import {
  checkCustomer,
  postalLabel,
  postalRequired,
  REGIONS,
  type CheckoutCustomer,
  type CustomerErrors,
  type CustomerField,
  type PaymentMethod,
} from "@/lib/shared/checkout";
import { countryName } from "@/lib/shared/countries";
import { formatPrice } from "@/lib/shared/format";
import { dayRange, shippableCountries, shippingCents as shippingFor, zoneFor } from "@/lib/shared/shipping";

const SAVED_KEY = "nh-checkout-details-v1";
type Draft = Record<Exclude<CustomerField, "country">, string>;
const EMPTY: Draft = { email: "", phone: "", name: "", line1: "", line2: "", city: "", state: "", postal: "" };
/** The order fields appear in, so the first problem can be focused. */
const ORDER: CustomerField[] = ["email", "phone", "country", "name", "line1", "line2", "city", "state", "postal"];

function Section({ title, step, children }: { title: string; step: number; children: ReactNode }) {
  return (
    <fieldset className="border-t border-rule pt-6">
      <legend className="sr-only">{title}</legend>
      <p aria-hidden="true" className="mb-5 flex items-baseline gap-3 text-[0.75rem] uppercase tracking-[0.14em]">
        <span className="muted tabular-nums">{String(step).padStart(2, "0")}</span>
        {title}
      </p>
      <div className="grid gap-5">{children}</div>
    </fieldset>
  );
}

/**
 * The site's own checkout page: contact and shipping details first (checked here and again on
 * the server), then the payment — PayPal's secure page, or a Cash App order. Nothing is charged
 * on this page.
 */
export function CheckoutView() {
  const { lines, ready, subtotalCents, country, setCountry } = useCart();
  const { settings, zones, commerce, content } = useStore();
  const uid = useId();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("paypal");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Details saved on this device from a previous order (only if the shopper chose to).
  useEffect(() => {
    const saved = readJSON<(Partial<Draft> & { country?: string }) | null>(SAVED_KEY, null);
    if (saved && typeof saved === "object") {
      setDraft((d) => ({ ...d, ...Object.fromEntries(Object.entries(saved).filter(([k, v]) => k in EMPTY && typeof v === "string")) }));
      if (typeof saved.country === "string" && !country) setCountry(saved.country);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countries = useMemo(
    () =>
      shippableCountries(zones)
        .map((code) => ({ code, name: countryName(code) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [zones],
  );
  const zone = zoneFor(zones, country);
  const code = zone && country ? country : "";
  const shipping = zone ? shippingFor(zone, subtotalCents) : null;
  const delivery = zone ? dayRange(zone.minDays, zone.maxDays) : null;
  const total = subtotalCents + (shipping ?? 0);
  const blocked = lines.some((l) => (l.problem && !l.problem.startsWith("Only")) || l.unitCents == null);
  const cashApp = Boolean(commerce.cashTag) && code === "US";
  const pay: PaymentMethod = method === "cashapp" && !cashApp ? "paypal" : method;
  const regions = code ? REGIONS[code] : undefined;

  const customer = (): CheckoutCustomer => ({
    email: draft.email,
    phone: draft.phone || null,
    name: draft.name,
    line1: draft.line1,
    line2: draft.line2 || null,
    city: draft.city,
    state: draft.state || null,
    postal: draft.postal || null,
    country: code,
  });
  const recheck = (next: Draft, nextCountry = code) => {
    if (!submitted) return;
    const r = checkCustomer({ ...customer(), ...next, country: nextCountry });
    setErrors(r.ok ? {} : r.errors);
  };
  const set = (k: keyof Draft) => (v: string) => {
    const next = { ...draft, [k]: v };
    setDraft(next);
    recheck(next);
  };
  const changeCountry = (c: string) => {
    setCountry(c || null);
    // A state picked for one country means nothing in another.
    const next = { ...draft, state: REGIONS[c] && !REGIONS[c].options.some(([x]) => x === draft.state) ? "" : draft.state };
    setDraft(next);
    recheck(next, c);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitted(true);
    const r = checkCustomer(customer());
    if (!r.ok) {
      setErrors(r.errors);
      const first = ORDER.find((f) => r.errors[f]);
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});
    setPending(true);
    const res = await startCheckout(
      lines.map((l) => ({ productId: l.product.id, variantId: l.variant.id, quantity: l.quantity })),
      r.value,
      pay,
    );
    if (res.ok) {
      if (remember) {
        const { country: c, ...rest } = r.value;
        writeJSON(SAVED_KEY, { ...rest, phone: rest.phone ?? "", line2: rest.line2 ?? "", state: rest.state ?? "", postal: rest.postal ?? "", country: c });
      } else {
        writeJSON(SAVED_KEY, null);
      }
      window.location.assign(res.data.url);
      return;
    }
    setPending(false);
    if (res.fields) setErrors(res.fields as CustomerErrors);
    setError(res.message);
  };

  const field = (
    k: keyof Draft,
    label: string,
    props: { autoComplete: string; type?: string; inputMode?: "email" | "tel" | "text"; optional?: boolean; hint?: string } ,
  ) => {
    const id = `${uid}-${k}`;
    const err = errors[k];
    return (
      <div>
        <label htmlFor={id} className="label">
          {label}
          {props.optional ? <span className="muted"> (optional)</span> : null}
        </label>
        <input
          id={id}
          name={k}
          type={props.type ?? "text"}
          inputMode={props.inputMode}
          autoComplete={props.autoComplete}
          value={draft[k]}
          onChange={(e) => set(k)(e.target.value)}
          className="field"
          aria-invalid={Boolean(err)}
          aria-describedby={err || props.hint ? `${id}-msg` : undefined}
          required={!props.optional}
        />
        {(err || props.hint) && (
          <p id={`${id}-msg`} className={err ? "form-error mt-1.5" : "muted mt-1.5 text-[0.75rem]"}>
            {err ?? props.hint}
          </p>
        )}
      </div>
    );
  };

  if (!ready) {
    return (
      <div className="shell pb-24 pt-10 md:pt-16">
        <div className="skeleton h-64" aria-hidden="true" />
      </div>
    );
  }
  if (!lines.length) {
    return (
      <div className="shell pb-24 pt-10 md:pt-16">
        <h1 className="page-title">Checkout</h1>
        <EmptyBag />
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;
  return (
    <div className="shell pb-24 pt-10 md:pt-16">
      <nav aria-label="Checkout steps" className="muted mb-6 text-[0.75rem]">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/cart" className="hover:text-bone">
              Bag
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="step" className="text-bone">
            Details
          </li>
          <li aria-hidden="true">/</li>
          <li>Payment</li>
        </ol>
      </nav>
      <h1 className="page-title mb-8 md:mb-12">Checkout</h1>

      <form ref={formRef} onSubmit={submit} noValidate className="grid gap-12 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-20">
        <div className="flex flex-col gap-10">
          <Section title="Contact" step={1}>
            {field("email", "Email", {
              autoComplete: "email",
              type: "email",
              inputMode: "email",
              hint: "Your order confirmation and shipping updates go here.",
            })}
            {field("phone", "Phone", {
              autoComplete: "tel",
              type: "tel",
              inputMode: "tel",
              optional: true,
              hint: "Only for the delivery company, if they need to reach you.",
            })}
          </Section>

          <Section title="Shipping address" step={2}>
            <div>
              <label htmlFor={`${uid}-country`} className="label">
                Country
              </label>
              <select
                id={`${uid}-country`}
                name="country"
                autoComplete="country"
                className="select w-full"
                value={code}
                onChange={(e) => changeCountry(e.target.value)}
                aria-invalid={Boolean(errors.country)}
                aria-describedby={errors.country ? `${uid}-country-msg` : undefined}
                required
              >
                <option value="">Choose a country</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.country && (
                <p id={`${uid}-country-msg`} className="form-error mt-1.5">
                  {errors.country}
                </p>
              )}
            </div>
            {field("name", "Full name", { autoComplete: "name" })}
            {field("line1", "Address", { autoComplete: "address-line1" })}
            {field("line2", "Apartment, suite, unit", { autoComplete: "address-line2", optional: true })}
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="sm:col-span-1">{field("city", "City", { autoComplete: "address-level2" })}</div>
              <div>
                {regions ? (
                  <>
                    <label htmlFor={`${uid}-state`} className="label">
                      {regions.label}
                    </label>
                    <select
                      id={`${uid}-state`}
                      name="state"
                      autoComplete="address-level1"
                      className="select w-full"
                      value={draft.state}
                      onChange={(e) => set("state")(e.target.value)}
                      aria-invalid={Boolean(errors.state)}
                      aria-describedby={errors.state ? `${uid}-state-msg` : undefined}
                      required
                    >
                      <option value="">Choose</option>
                      {regions.options.map(([c, n]) => (
                        <option key={c} value={c}>
                          {n}
                        </option>
                      ))}
                    </select>
                    {errors.state && (
                      <p id={`${uid}-state-msg`} className="form-error mt-1.5">
                        {errors.state}
                      </p>
                    )}
                  </>
                ) : (
                  field("state", "State / region", { autoComplete: "address-level1", optional: true })
                )}
              </div>
              <div>
                {field("postal", code ? postalLabel(code) : "Postal code", {
                  autoComplete: "postal-code",
                  optional: Boolean(code) && !postalRequired(code),
                })}
              </div>
            </div>
            {delivery && <p className="muted text-[0.75rem]">Estimated delivery: {delivery} after dispatch.</p>}
          </Section>

          <Section title="Payment" step={3}>
            {cashApp ? (
              <div role="radiogroup" aria-label="Payment method" className="grid gap-3">
                <PayOption
                  checked={pay === "paypal"}
                  onSelect={() => setMethod("paypal")}
                  title="Debit or credit card, or PayPal"
                  body="On PayPal’s secure page. No PayPal account needed to pay by card."
                />
                <PayOption
                  checked={pay === "cashapp"}
                  onSelect={() => setMethod("cashapp")}
                  title="Cash App"
                  body={`Place your order, then send the total to ${commerce.cashTag} with your order number. We ship once it arrives.`}
                />
              </div>
            ) : (
              <p className="text-[0.875rem] leading-relaxed">
                {commerce.processor === "PayPal"
                  ? "Debit or credit card, or PayPal, on PayPal’s secure page. No PayPal account needed to pay by card."
                  : (commerce.methods ?? content.payment_methods_note)}
                {commerce.cashTag && code && code !== "US" ? (
                  <span className="muted block mt-2 text-[0.75rem]">Cash App is available for orders shipping within the US.</span>
                ) : null}
              </p>
            )}
            <label className="flex items-start gap-3 text-[0.8125rem] leading-relaxed text-silver">
              <input type="checkbox" className="check" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Save my details on this device for next time</span>
            </label>
          </Section>
        </div>

        <aside aria-label="Order summary" className="md:sticky md:top-[calc(var(--hdr-h)+24px)] md:self-start">
          <div className="border border-rule bg-surface p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="caps">Order summary</h2>
              <Link href="/cart" className="text-link muted text-[0.75rem]">
                Edit bag
              </Link>
            </div>
            <ul className="mt-5 divide-y divide-rule border-y border-rule">
              {lines.map((l) => {
                const img = l.product.images[0];
                return (
                  <li key={`${l.product.id}:${l.variant.id}`} className="flex gap-4 py-4">
                    <span className="relative h-20 w-16 flex-none">
                      <span className="frame block h-full w-full">
                        {img && <Image src={img.url} alt="" fill sizes="64px" className="object-cover" style={{ objectPosition: img.focal }} />}
                      </span>
                      <span
                        className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-bone px-1 text-[0.625rem] text-ink tabular-nums"
                        aria-label={`Quantity ${l.quantity}`}
                      >
                        {l.quantity}
                      </span>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[0.8125rem] leading-snug">{l.product.name}</span>
                      <span className="muted mt-0.5 text-[0.75rem]">Size {l.variant.size}</span>
                      {l.problem && <span className="form-error mt-1">{l.problem}</span>}
                    </span>
                    <span className="text-[0.8125rem] tabular-nums">{l.lineCents == null ? "—" : formatPrice(l.lineCents, settings.currency)}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-5 flex flex-col gap-2 text-[0.875rem]">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(subtotalCents, settings.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="muted">Shipping{code ? ` to ${countryName(code)}` : ""}</dt>
                <dd className="muted tabular-nums">
                  {shipping == null ? "Choose a country" : shipping === 0 ? "Free" : formatPrice(shipping, settings.currency)}
                </dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-rule pt-4 text-[1rem]">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  <span className="muted mr-2 text-[0.6875rem] uppercase tracking-[0.12em]">{settings.currency}</span>
                  {formatPrice(total, settings.currency)}
                </dd>
              </div>
            </dl>

            {submitted && errorCount > 0 && (
              <p className="form-error mt-5" role="alert">
                {errorCount === 1 ? "One detail needs a look." : `${errorCount} details need a look.`} Check the highlighted fields.
              </p>
            )}
            {error && !(submitted && errorCount > 0) && (
              <p className="form-error mt-5" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="btn btn-solid btn-block mt-6"
              disabled={pending || blocked || !commerce.checkoutEnabled}
            >
              {pending ? (pay === "cashapp" ? "Placing order…" : "Opening secure payment…") : pay === "cashapp" ? "Place order" : "Continue to payment"}
            </button>
            {!commerce.checkoutEnabled && commerce.message && (
              <p className="muted mt-3 text-[0.8125rem]" role="status">
                {commerce.message}
              </p>
            )}
            <p className="muted mt-4 flex items-start gap-2 text-[0.75rem] leading-relaxed">
              <LockIcon size={13} className="mt-0.5 flex-none" />
              {pay === "cashapp"
                ? `Next you’ll see your order number and the amount to send to ${commerce.cashTag}.`
                : `You’ll pay on ${commerce.processor ?? "the payment company"}’s secure page. Card details never touch this site.`}
            </p>
            {commerce.testMode && (
              <p className="mt-4 border border-rule px-3 py-2 text-[0.75rem] leading-relaxed" role="note">
                Test mode: no real payments are taken.
              </p>
            )}
            {content.checkout_note && <p className="mt-4 text-[0.75rem] leading-relaxed">{content.checkout_note}</p>}
            {content.duties_disclosure && code && code !== "US" && (
              <p className="muted mt-3 text-[0.6875rem] leading-relaxed">{content.duties_disclosure}</p>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}

function PayOption({ checked, onSelect, title, body }: { checked: boolean; onSelect: () => void; title: string; body: string }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onSelect} className="pay-option" data-checked={checked}>
      <span className="pay-dot" aria-hidden="true" />
      <span className="flex flex-col gap-1 text-left">
        <span className="text-[0.875rem]">{title}</span>
        <span className="muted text-[0.75rem] leading-relaxed">{body}</span>
      </span>
    </button>
  );
}

export interface CashAppOrderSummary {
  orderNumber: string;
  status: string;
  email: string | null;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  currency: string;
  shippingName: string | null;
  address: { line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null } | null;
  items: { name: string; size: string | null; quantity: number; unitCents: number }[];
}

/**
 * After a Cash App order is placed: exactly what to send, where, and what to write in the note.
 * It only says "paid" once the owner has confirmed the money arrived.
 */
export function CashAppOrderView({ order, cashTag, payUrl }: { order: CashAppOrderSummary | null; cashTag: string | null; payUrl: string | null }) {
  const { clear } = useCart();
  const { settings } = useStore();
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    if (order) clear();
  }, [order, clear]);
  if (!order) {
    return (
      <div className="shell flex min-h-[60vh] flex-col items-start justify-center gap-6 py-24">
        <h1 className="page-title">Order not found</h1>
        <p className="muted max-w-[52ch] text-[0.875rem]">
          This link doesn’t match an order. If you placed one, the details are in your email. Questions:{" "}
          {settings.contactEmail ? (
            <a className="text-link text-bone" href={`mailto:${settings.contactEmail}`}>
              {settings.contactEmail}
            </a>
          ) : (
            <Link className="text-link text-bone" href="/info/contact">
              contact us
            </Link>
          )}
        </p>
        <Link href="/shop" className="btn btn-line">
          Continue browsing
        </Link>
      </div>
    );
  }
  const money = (c: number) => formatPrice(c, order.currency);
  const waiting = order.status === "awaiting_payment";
  const closed = order.status === "canceled" || order.status === "refunded";
  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard blocked: the value is on screen to copy by hand */
    }
  };
  const a = order.address;
  return (
    <div className="shell pb-24 pt-10 md:pt-16">
      <div className="grid gap-12 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-20">
        <div>
          <p className="muted text-[0.75rem] uppercase tracking-[0.14em]">Order {order.orderNumber}</p>
          {closed ? (
            <h1 className="page-title mt-3">This order was cancelled</h1>
          ) : waiting ? (
            <>
              <h1 className="page-title mt-3">Send your payment to finish</h1>
              <p className="muted mt-3 max-w-[52ch] text-[0.875rem] leading-relaxed">
                Your pieces are reserved. Pay in Cash App within 48 hours and we’ll ship as soon as the money arrives.
                {order.email ? ` These steps are also in your email (${order.email}).` : ""}
              </p>
              <ol className="mt-10 flex flex-col gap-6 border-t border-rule pt-8">
                <li className="flex gap-4">
                  <span className="muted w-6 flex-none tabular-nums text-[0.75rem]">01</span>
                  <div className="flex flex-1 flex-col gap-3">
                    <p className="text-[0.9375rem]">
                      Send exactly <strong className="font-medium">{money(order.totalCents)}</strong> to{" "}
                      <strong className="font-medium">{cashTag}</strong>
                    </p>
                    {payUrl && (
                      <a href={payUrl} target="_blank" rel="noopener noreferrer" className="btn btn-solid self-start">
                        Open Cash App
                      </a>
                    )}
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="muted w-6 flex-none tabular-nums text-[0.75rem]">02</span>
                  <div className="flex flex-1 flex-col gap-3">
                    <p className="text-[0.9375rem]">
                      In the “For” note, write <strong className="font-medium">{order.orderNumber}</strong>
                    </p>
                    <button type="button" className="btn btn-line self-start" onClick={() => copy("number", order.orderNumber)}>
                      {copied === "number" ? "Copied" : "Copy order number"}
                    </button>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="muted w-6 flex-none tabular-nums text-[0.75rem]">03</span>
                  <p className="text-[0.9375rem]">We check the payment, then email you when your order ships.</p>
                </li>
              </ol>
              <p className="muted mt-10 max-w-[52ch] border-t border-rule pt-6 text-[0.75rem] leading-relaxed">
                Only ever send money to {cashTag}. We’ll never ask you to pay anyone else, or to pay twice. Unpaid orders are
                cancelled after 48 hours.
              </p>
            </>
          ) : (
            <>
              <h1 className="page-title mt-3">Payment received. Thank you</h1>
              <p className="muted mt-3 max-w-[52ch] text-[0.875rem] leading-relaxed">
                We’ll email {order.email ?? "you"} when your order ships.
              </p>
            </>
          )}
          <div className="mt-10 flex gap-3">
            <Link href="/shop" className="btn btn-line">
              Continue browsing
            </Link>
          </div>
        </div>

        <aside aria-label="Order summary" className="md:self-start">
          <div className="border border-rule bg-surface p-6">
            <h2 className="caps">Order summary</h2>
            <ul className="mt-5 flex flex-col gap-2 border-y border-rule py-4 text-[0.8125rem]">
              {order.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span>
                    {it.name}
                    {it.size ? ` — ${it.size}` : ""} × {it.quantity}
                  </span>
                  <span className="tabular-nums">{money(it.unitCents * it.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 flex flex-col gap-2 text-[0.875rem]">
              <div className="flex justify-between">
                <dt className="muted">Subtotal</dt>
                <dd className="tabular-nums">{money(order.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="muted">Shipping</dt>
                <dd className="tabular-nums">{order.shippingCents === 0 ? "Free" : money(order.shippingCents)}</dd>
              </div>
              <div className="mt-2 flex justify-between border-t border-rule pt-4 text-[1rem]">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(order.totalCents)}</dd>
              </div>
            </dl>
            {a && (
              <div className="mt-6 text-[0.8125rem]">
                <p className="muted">Shipping to</p>
                <address className="mt-1 not-italic leading-relaxed">
                  {order.shippingName}
                  <br />
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}
                  <br />
                  {[a.city, a.state, a.postal_code].filter(Boolean).join(", ")}
                  <br />
                  {a.country ? countryName(a.country) : ""}
                </address>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
