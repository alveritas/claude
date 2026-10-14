import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ACCOUNT = ["/account/login", "/account/register", "/account/forgot-password"];

/**
 * Refreshes the Supabase session cookie on each request and sends signed-out visitors
 * away from account/admin pages. Admin *authorisation* is enforced again on the server
 * in every admin page and action (requireAdmin), not only here.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NH_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NH_SUPABASE_PUBLIC_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const needsUser =
    path.startsWith("/admin") || (path.startsWith("/account") && !PUBLIC_ACCOUNT.some((p) => path.startsWith(p)));
  if (needsUser && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/account/login";
    login.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  // Skip static files, images and the Stripe webhook (which must receive the raw, unmodified request).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|og.jpg|brand/|images/|api/webhooks/).*)"],
};
