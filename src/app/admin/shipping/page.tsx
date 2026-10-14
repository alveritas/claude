import { AdminHead, Panel } from "@/components/admin/AdminHead";
import { AdminForm, Check, ConfirmButton, Field } from "@/components/admin/AdminUI";
import { adminSettings, adminZones } from "@/lib/server/admin-data";
import { requireAdmin } from "@/lib/server/auth";
import { describeCountries } from "@/lib/shared/countries";
import { deleteZone, saveDispatch, saveZone } from "../actions";

const money = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));

function ZoneFields({ z }: { z?: Awaited<ReturnType<typeof adminZones>>[number] }) {
  return (
    <>
      {z && <input type="hidden" name="id" value={z.id} />}
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Zone name" name="name" defaultValue={z?.name} required placeholder="United States" />
        <Field
          label="Countries"
          name="countries"
          defaultValue={z?.countries.join(", ")}
          required
          placeholder="US"
          hint="Two-letter codes separated by commas, e.g. GB, IE, FR. Use * for everywhere else — every country no other zone lists."
        />
        <Field label="Rate" name="rate" defaultValue={money(z?.rateCents ?? null)} required placeholder="0.00" />
        <Field label="Free shipping over (optional)" name="free_over" defaultValue={money(z?.freeOverCents ?? null)} />
        <Field label="Delivery estimate — min business days" name="min_days" type="number" defaultValue={z?.minDays ?? ""} />
        <Field label="Delivery estimate — max business days" name="max_days" type="number" defaultValue={z?.maxDays ?? ""} />
      </div>
      <div className="mt-6">
        <Check label="Active (customers can check out to these countries)" name="is_active" defaultChecked={z?.isActive ?? true} />
      </div>
    </>
  );
}

export default async function ShippingAdmin() {
  const { supabase } = await requireAdmin();
  const [zones, settings] = await Promise.all([adminZones(supabase), adminSettings(supabase)]);
  const anyActive = zones.some((z) => z.isActive);
  return (
    <>
      <AdminHead title="Shipping">
        Checkout offers exactly the countries in the zones switched on here, and charges the zone’s rate (free above the
        threshold, if set). A country listed in a zone by name uses that zone; every other country uses the * zone. Rates use the
        store currency.
      </AdminHead>
      {zones.length === 0 && <p className="mb-8 max-w-3xl text-[0.875rem]">No zones yet, so checkout is closed to every destination.</p>}
      {zones.length > 0 && !anyActive && (
        <p className="mb-8 max-w-3xl text-[0.875rem]">
          These zones are suggested starting rates and are switched off. Check them against your carrier’s prices, then tick Active
          and save — checkout stays closed until at least one zone is on.
        </p>
      )}
      <Panel title="Dispatch time">
        <AdminForm action={saveDispatch} submitLabel="Save dispatch time">
          <p className="muted mb-5 text-[0.8125rem]">How long you take to pack and hand an order to the carrier. Shown on the Shipping page. Leave empty to not state it.</p>
          <div className="grid max-w-md grid-cols-2 gap-6">
            <Field label="From (business days)" name="dispatch_min_days" type="number" defaultValue={settings.dispatchMinDays ?? ""} />
            <Field label="To (business days)" name="dispatch_max_days" type="number" defaultValue={settings.dispatchMaxDays ?? ""} />
          </div>
        </AdminForm>
      </Panel>
      {zones.map((z) => (
        <Panel key={z.id} title={`${z.name}${z.isActive ? "" : " — switched off"}`}>
          <p className="muted mb-5 text-[0.8125rem]">{describeCountries(z.countries)}</p>
          <AdminForm action={saveZone}><ZoneFields z={z} /></AdminForm>
          <form action={deleteZone} className="mt-4">
            <input type="hidden" name="id" value={z.id} />
            <ConfirmButton message={`Delete the ${z.name} zone?`}>Delete zone</ConfirmButton>
          </form>
        </Panel>
      ))}
      <Panel title="Add a zone">
        <AdminForm action={saveZone} submitLabel="Add zone"><ZoneFields /></AdminForm>
      </Panel>
    </>
  );
}
