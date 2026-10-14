import Link from "next/link";
import { AccountsUnavailable } from "@/components/account/AuthForm";
import { AddressForm, SubmitButton } from "@/components/account/AccountForms";
import { requireUser } from "@/lib/server/auth";
import { hasSupabase } from "@/lib/server/env";
import { countryName } from "@/lib/shared/countries";
import { deleteAddress, makeDefaultAddress, saveAddress } from "../actions";

export default async function AddressesPage() {
  if (!hasSupabase()) return <AccountsUnavailable />;
  const { supabase } = await requireUser("/account/addresses");
  const { data: addresses } = await supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at");
  return (
    <div className="max-w-3xl">
      <Link href="/account" className="text-link muted text-[0.75rem]">Back to account</Link>
      <h1 className="page-title mt-6">Addresses</h1>
      {addresses?.length ? (
        <ul className="mt-8 divide-y divide-rule border-y border-rule">
          {addresses.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 py-6 md:flex-row md:justify-between">
              <address className="not-italic text-[0.875rem] leading-relaxed">
                {a.full_name}<br />{a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />
                {[a.city, a.region, a.postal_code].filter(Boolean).join(", ")}<br />{countryName(a.country)}
                {a.is_default && <span className="tag ml-0 mt-2 block w-fit">Default</span>}
              </address>
              <div className="flex gap-4">
                {!a.is_default && (
                  <form action={makeDefaultAddress}>
                    <input type="hidden" name="id" value={a.id} />
                    <SubmitButton className="text-link muted text-[0.75rem]" pendingText="…">Make default</SubmitButton>
                  </form>
                )}
                <form action={deleteAddress}>
                  <input type="hidden" name="id" value={a.id} />
                  <SubmitButton className="text-link muted text-[0.75rem]" pendingText="Removing…">Remove</SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted mt-8">No saved addresses yet.</p>
      )}
      <h2 className="mt-14 text-[1.25rem] font-light">Add an address</h2>
      <div className="mt-6"><AddressForm action={saveAddress} /></div>
    </div>
  );
}
