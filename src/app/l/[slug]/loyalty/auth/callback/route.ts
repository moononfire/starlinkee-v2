import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { setLoyaltySession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const slug = searchParams.get("slug");
  const scanToken = searchParams.get("scanToken");
  const locationId = searchParams.get("locationId");

  const loyaltyUrl = `/l/${slug}/loyalty${scanToken ? `?scan=${encodeURIComponent(scanToken)}` : ""}`;

  if (!code || !slug || !locationId) {
    return NextResponse.redirect(new URL(loyaltyUrl, request.url));
  }

  const response = NextResponse.redirect(new URL(loyaltyUrl, request.url));

  // Separate cookie name from the portal's own Supabase session — this is
  // only used transiently to complete the Google handshake, so it must
  // never collide with (or overwrite) a business owner's portal login in
  // the same browser.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: "sb-loyalty-auth" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`${loyaltyUrl}${scanToken ? "&" : "?"}error=auth_failed`, request.url));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.redirect(new URL(`${loyaltyUrl}${scanToken ? "&" : "?"}error=auth_failed`, request.url));
  }

  await setLoyaltySession(user.id, user.email, Number(locationId));

  // Discard the transient Supabase session — our own long-lived
  // starlinkee_loyalty cookie (set above) is the source of truth from here on.
  await supabase.auth.signOut();

  return response;
}
