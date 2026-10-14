import { NextResponse } from "next/server";
import { getSessionUser, isAdminUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const cell = (v: string) => {
  // Neutralise spreadsheet formula injection and quote the value.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function GET() {
  const session = await getSessionUser();
  if (!session || !(await isAdminUser(session.supabase, session.user.id))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }
  const { data, error } = await session.supabase
    .from("newsletter_subscribers")
    .select("email, source, created_at")
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const csv = ["email,source,joined_at", ...(data ?? []).map((r) => [cell(r.email), cell(r.source ?? ""), cell(r.created_at)].join(","))].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="neverhollow-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
