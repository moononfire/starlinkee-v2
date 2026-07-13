import { createBrowserClient } from "@supabase/ssr";

// Isolated cookie namespace so a customer's loyalty sign-in never collides
// with (or overwrites) a business owner's portal session in the same
// browser. Must match the cookie name used by the server-side client in
// src/app/l/[slug]/loyalty/auth/callback/route.ts — the PKCE code_verifier
// is written under this name here and read back under the same name there.
export function createLoyaltyClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { name: "sb-loyalty-auth" } }
  );
}
