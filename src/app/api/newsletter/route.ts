import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/server/supabase";
import { isValidEmail } from "@/lib/shared/format";

const json = (body: object, status = 200) => NextResponse.json(body, { status });

export async function POST(req: Request) {
  let body: { email?: unknown; consent?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, code: "bad_request", message: "Something went wrong. Try again." }, 400);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  if (!isValidEmail(email)) {
    return json({ ok: false, code: "invalid_email", message: "Enter a valid email address." }, 400);
  }
  if (body.consent !== true) {
    return json({ ok: false, code: "consent_required", message: "Tick the box to agree to release emails." }, 400);
  }
  const sb = getServiceSupabase();
  if (!sb) {
    return json(
      { ok: false, code: "not_configured", message: "Signups aren’t open yet. Please try again soon." },
      503,
    );
  }
  const source = typeof body.source === "string" ? body.source.slice(0, 40) : null;
  const { error } = await sb.from("newsletter_subscribers").insert({ email, consent: true, source });
  if (error) {
    if (error.code === "23505") {
      return json({ ok: false, code: "duplicate", message: "That email is already on the list." }, 409);
    }
    console.error("newsletter insert failed", error);
    return json({ ok: false, code: "server_error", message: "We couldn’t add you just now. Try again in a moment." }, 500);
  }
  return json({ ok: true });
}
