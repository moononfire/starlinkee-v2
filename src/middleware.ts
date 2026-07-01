import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Matches /plate/[number]/[secret] — exactly 2 path segments (scan initiation, not the review page)
const PLATE_SCAN_PATTERN = /^\/plate\/[^/]+\/[^/]+$/;
// Matches /l/[slug]/review
const LINKTREE_REVIEW_PATTERN = /^\/l\/[^/]+\/review$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Set a persistent device-identity cookie on scan initiation pages so
  // the server component can read it when creating the scan record.
  if (PLATE_SCAN_PATTERN.test(pathname) || LINKTREE_REVIEW_PATTERN.test(pathname)) {
    const response = NextResponse.next({ request });
    if (!request.cookies.has("_did")) {
      response.cookies.set("_did", crypto.randomUUID(), {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
        sameSite: "lax",
      });
    }
    return response;
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminLoginPage = pathname === "/login";
  const isPortalPublic =
    pathname === "/portal/login" ||
    pathname === "/portal/activate" ||
    pathname === "/portal/forgot-password" ||
    pathname === "/portal/reset-password" ||
    pathname.startsWith("/portal/auth");
  const isPortalRoute = pathname.startsWith("/portal") && !isPortalPublic;

  if (isAdminRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAdminLoginPage && user) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  if (isPortalRoute && !user) {
    return NextResponse.redirect(new URL("/portal/login", request.url));
  }

  if (pathname === "/portal/login" && user) {
    return NextResponse.redirect(new URL("/portal/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/portal/:path*", "/plate/:path*", "/l/:path*"],
};
