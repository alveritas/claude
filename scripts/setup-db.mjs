// Creates or updates the store's database tables during each Vercel build, so nothing has to be
// pasted into Supabase by hand. Runs supabase/migrations/0001_init.sql and supabase/seed.sql,
// which are written to be safe to run again: they never overwrite products, prices, stock,
// orders or settings you've changed in the admin.
//
// It needs a Postgres address: the one Vercel's Supabase integration adds, or DATABASE_URL.
// Without one — on your own computer, or before Supabase is connected — it skips, and the site
// runs from the built-in catalogue.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
// Vercel's Supabase integration sets POSTGRES_URL_NON_POOLING / POSTGRES_URL; on Netlify (or
// anywhere else) paste Supabase's connection string as DATABASE_URL.
const candidates = [
  process.env.POSTGRES_URL_NON_POOLING,
  process.env.POSTGRES_URL,
  process.env.DATABASE_URL,
  process.env.SUPABASE_DB_URL,
]
  .map((v) => v?.trim())
  .filter((v) => v && /^postgres(ql)?:\/\//.test(v));

if (process.env.SKIP_DB_SETUP === "1" || !candidates.length) {
  console.log("[setup-db] No database connected yet; skipping table setup.");
  process.exit(0);
}

const { default: pg } = await import("pg");
const files = ["supabase/migrations/0001_init.sql", "supabase/seed.sql"].map((f) => [f, fs.readFileSync(path.join(root, f), "utf8")]);

/** Supabase needs TLS; its certificate chain isn't in Node's store, so verify-full would fail. */
function clientFor(url) {
  const local = /@(localhost|127\.0\.0\.1)[:/]|host=\//.test(url);
  const connectionString = url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
  return new pg.Client({ connectionString, ssl: local ? false : { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
}

let lastError = null;
for (const url of [...new Set(candidates)]) {
  const client = clientFor(url);
  try {
    await client.connect();
  } catch (e) {
    lastError = e;
    console.log(`[setup-db] Couldn't connect with one database address (${e.message}); trying the next.`);
    continue;
  }
  try {
    for (const [name, sql] of files) {
      await client.query(sql);
      console.log(`[setup-db] Applied ${name}`);
    }
    console.log("[setup-db] Database is ready.");
    await client.end();
    process.exit(0);
  } catch (e) {
    await client.end().catch(() => {});
    console.error(`[setup-db] Setting up the database failed: ${e.message}`);
    console.error("[setup-db] Send this message over, or run the two SQL files in Supabase's SQL Editor and redeploy.");
    process.exit(1);
  }
}
console.error(`[setup-db] Couldn't reach the database: ${lastError?.message ?? "unknown error"}`);
process.exit(1);
