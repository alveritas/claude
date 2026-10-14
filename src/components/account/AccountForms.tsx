"use client";

import { useActionState, useMemo, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/(store)/account/actions";
import { countryName } from "@/lib/shared/countries";

export function SubmitButton({ children, pendingText = "Saving…", className = "btn btn-solid" }: { children: ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

function Message({ state }: { state: FormState }) {
  if (state.error) return <p role="alert" className="form-error">{state.error}</p>;
  if (state.ok) return <p role="status" className="form-success">{state.ok}</p>;
  return null;
}

// A broad ISO list for the address book; checkout itself only offers configured destinations.
const ISO = "AD AE AT AU BE BG BR CA CH CL CN CO CY CZ DE DK EE ES FI FR GB GR HK HR HU ID IE IL IN IS IT JP KR KW LI LT LU LV MA MC MT MX MY NG NL NO NZ PE PH PL PT QA RO RS SA SE SG SI SK TH TR TW UA US VN ZA".split(" ");

export function AddressForm({ action }: { action: (s: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, {});
  const countries = useMemo(() => ISO.map((c) => ({ c, n: countryName(c) })).sort((a, b) => a.n.localeCompare(b.n)), []);
  return (
    <form action={formAction} className="grid gap-5 md:grid-cols-2">
      {[
        ["full_name", "Full name", "name", true],
        ["phone", "Phone (optional)", "tel", false],
        ["line1", "Address line 1", "address-line1", true],
        ["line2", "Address line 2 (optional)", "address-line2", false],
        ["city", "City", "address-level2", true],
        ["region", "State / region (optional)", "address-level1", false],
        ["postal_code", "Postal code", "postal-code", false],
      ].map(([name, label, ac, req]) => (
        <div key={name as string}>
          <label className="label" htmlFor={`addr-${name}`}>{label}</label>
          <input id={`addr-${name}`} name={name as string} autoComplete={ac as string} required={req as boolean} className="field" />
        </div>
      ))}
      <div>
        <label className="label" htmlFor="addr-country">Country</label>
        <select id="addr-country" name="country" required className="select w-full" defaultValue="">
          <option value="" disabled>Choose a country</option>
          {countries.map(({ c, n }) => (
            <option key={c} value={c}>{n}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-3 text-[0.875rem] md:col-span-2">
        <input type="checkbox" name="is_default" className="check mt-0" /> Use as my default address
      </label>
      <div className="flex items-center gap-4 md:col-span-2">
        <SubmitButton>Save address</SubmitButton>
        <Message state={state} />
      </div>
    </form>
  );
}

export function ProfileForm({ action, name }: { action: (s: FormState, fd: FormData) => Promise<FormState>; name: string }) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      <div>
        <label className="label" htmlFor="profile-name">Name</label>
        <input id="profile-name" name="full_name" defaultValue={name} autoComplete="name" className="field" />
      </div>
      <div className="flex items-center gap-4">
        <SubmitButton>Save</SubmitButton>
        <Message state={state} />
      </div>
    </form>
  );
}
