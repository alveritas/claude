import Link from "next/link";
import { AdminHead, Panel } from "@/components/admin/AdminHead";
import { AdminForm, Field, LocalDateTime } from "@/components/admin/AdminUI";
import { adminProducts, adminSettings, adminZones } from "@/lib/server/admin-data";
import { requireAdmin } from "@/lib/server/auth";
import { releaseBlockers } from "@/lib/server/readiness";
import { paymentMode, paymentsReady } from "@/lib/server/payments";
import { releaseStore, saveSettings } from "../actions";

export const dynamic = "force-dynamic";

/** Announcement shown after release (editable before pressing Release). */
const RELEASE_ANNOUNCEMENT = "Drop 001 is out now | Worldwide shipping";

export default async function LaunchPage() {
  const { supabase } = await requireAdmin();
  const [s, products, zones, webhookReady] = await Promise.all([
    adminSettings(supabase),
    adminProducts(supabase),
    adminZones(supabase),
    paymentsReady(),
  ]);
  const blockers = releaseBlockers({ settings: s, products, zones, webhookReady });
  const ready = products.filter(
    (p) => (p.status === "coming_soon" || p.status === "available") && p.priceCents != null && p.variants.some((v) => v.stock > 0),
  );
  const waiting = products.filter((p) => p.status === "coming_soon" && !ready.includes(p));

  return (
    <>
      <AdminHead title="Launch and store settings">
        Release opens the store: every piece with a price and stock goes on sale and checkout turns on. You can pause sales at any
        time by switching back to Prelaunch below. Changes apply within seconds, with no rebuild.
      </AdminHead>

      {s.mode === "prelaunch" ? (
        <Panel title="Release Drop 001">
          {blockers.length ? (
            <>
              <p className="text-[0.875rem]">Before you can release:</p>
              <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[0.875rem]">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="muted mt-4 text-[0.8125rem]">
                The <Link href="/admin" className="text-link">Overview</Link> checklist shows where each one is set.
              </p>
            </>
          ) : (
            <AdminForm action={releaseStore} submitLabel="Release now">
              <p className="text-[0.875rem] leading-relaxed">
                {ready.length} piece{ready.length === 1 ? "" : "s"} will go on sale: {ready.map((p) => p.name).join(", ")}.
                {waiting.length > 0 && (
                  <span className="muted"> Still Coming soon (no stock yet): {waiting.map((p) => p.name).join(", ")}.</span>
                )}
              </p>
              {paymentMode() === "test" && (
                <p className="mt-3 text-[0.8125rem]">
                  Payments are in test mode, so customers can’t pay for real yet. That’s right for a test run; switch to the live
                  (production) key under Payments before announcing.
                </p>
              )}
              <div className="mt-6 max-w-xl">
                <Field
                  label="Announcement bar after release"
                  name="announcement"
                  defaultValue={RELEASE_ANNOUNCEMENT}
                  hint="Separate messages with | to rotate them. Leave empty to hide the bar."
                />
              </div>
            </AdminForm>
          )}
        </Panel>
      ) : (
        <Panel title="The store is live">
          <p className="text-[0.875rem] leading-relaxed">
            {products.filter((p) => p.status === "available").length} pieces are on sale.{" "}
            {paymentMode() === "test" && "Payments are still in test mode, so only test payments work. "}
            To pause sales, choose Prelaunch below and save.
          </p>
        </Panel>
      )}

      <AdminForm action={saveSettings} submitLabel="Save settings">
        <Panel title="Store mode">
          <div className="flex flex-col gap-3 text-[0.875rem]">
            <label className="flex items-start gap-3">
              <input type="radio" name="mode" value="prelaunch" defaultChecked={s.mode === "prelaunch"} className="mt-1" />
              <span>
                Prelaunch<span className="muted block text-[0.75rem]">Coming soon labels, Notify me, newsletter and wishlist. Purchases off.</span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input type="radio" name="mode" value="live" defaultChecked={s.mode === "live"} className="mt-1" />
              <span>
                Live<span className="muted block text-[0.75rem]">Add to bag and checkout for pieces set to Available with stock.</span>
              </span>
            </label>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <LocalDateTime
              label="Launch date and time (your local time)"
              name="launch_date"
              defaultIso={s.launchDate}
              hint="Optional. The homepage countdown only appears while this date is set and in the future."
            />
            <Field label="Announcement bar" name="announcement" defaultValue={s.announcement} hint="Separate messages with | to rotate them. Leave empty to hide the bar." />
          </div>
        </Panel>
        <Panel title="Contact and social">
          <div className="grid gap-6 md:grid-cols-3">
            <Field label="Contact email" name="contact_email" type="email" defaultValue={s.contactEmail} hint="Shown on the Contact page and in the policies." />
            <Field label="Instagram URL" name="instagram_url" defaultValue={s.instagramUrl} placeholder="https://instagram.com/…" />
            <Field label="TikTok URL" name="tiktok_url" defaultValue={s.tiktokUrl} placeholder="https://tiktok.com/@…" />
          </div>
        </Panel>
      </AdminForm>
    </>
  );
}
