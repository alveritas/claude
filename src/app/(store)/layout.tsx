import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { getStoreData } from "@/lib/server/catalog";
import { hasSupabase } from "@/lib/server/env";
import { getCommerceStatus } from "@/lib/server/readiness";
import { getRatingTallies } from "@/lib/server/reviews";
import { ensureLaunched } from "@/lib/server/launch";
import { paymentsReady } from "@/lib/server/payments";

// Storefront pages are cached for a minute; admin changes call revalidatePath() to refresh immediately.
export const revalidate = 60;

export default async function StoreLayout({ children }: { children: ReactNode }) {
  // First run with live payments: opens Drop 001 for sale (once; see lib/server/launch.ts).
  await ensureLaunched().catch(() => false);
  const [{ products, collections, settings, content, zones }, webhookReady, ratings] = await Promise.all([
    getStoreData(),
    paymentsReady(),
    getRatingTallies(),
  ]);
  const store = {
    products,
    collections,
    settings,
    content,
    zones,
    commerce: getCommerceStatus(settings, zones, webhookReady),
    accountsEnabled: hasSupabase(),
    ratings,
  };
  return (
    <div data-announcement={settings.announcement ? "1" : "0"}>
      <AppShell store={store}>{children}</AppShell>
    </div>
  );
}
