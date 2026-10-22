import { NextRequest, NextResponse } from "next/server";
import { checkWwwKey } from "@/lib/www-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { upsertCustomerByEmail } from "@/lib/db/customers";
import { getCustomerByEmail } from "@/lib/db/portal";
import { sendAccountLink } from "@/lib/email";
import { isEmailExistsError } from "@/lib/services/portal-account";
import { clientIp } from "@/lib/rate-limit";
import { rateLimitPersistent } from "@/lib/rate-limit-persistent";

const ALLOWED_LANGUAGES = ["en", "de", "pl"] as const;

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.starlinkee.com").replace(/\/$/, "");
}

/** Link that verifies a Supabase email token on our own domain (see /portal/auth/confirm). */
function confirmLink(tokenHash: string, type: string, next: string): string {
  const params = new URLSearchParams({ token_hash: tokenHash, type, next });
  return `${appUrl()}/portal/auth/confirm?${params.toString()}`;
}

/**
 * Sends the existing owner of this email a "set your password" link. Whether or
 * not an account/customer already existed is never revealed to the caller.
 */
async function sendSetPasswordLink(email: string, lang: string): Promise<void> {
  const admin = createAdminClient();

  // Existing auth user -> recovery link; no auth user yet (e.g. a customer added
  // by an admin) -> invite, which creates the account and confirms on click.
  let linkType: "recovery" | "invite" = "recovery";
  let { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (error || !data?.properties?.hashed_token) {
    linkType = "invite";
    ({ data, error } = await admin.auth.admin.generateLink({ type: "invite", email }));
  }
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    console.error("[signup] could not generate set-password link:", error);
    return;
  }

  await sendAccountLink(email, lang, {
    kind: "set-password",
    link: confirmLink(tokenHash, linkType, "/portal/reset-password"),
  });
}

export async function POST(request: NextRequest) {
  const authError = checkWwwKey(request);
  if (authError) return authError;

  const {
    email: rawEmail,
    password,
    name,
    address_line1,
    address_city,
    address_postal_code,
    country,
    preferred_language,
    source,
  } = await request.json();

  if (!rawEmail || !password || !name) {
    return NextResponse.json({ error: "Missing email, password or name" }, { status: 400 });
  }
  if (typeof rawEmail !== "string" || typeof password !== "string" || typeof name !== "string") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password too short" }, { status: 400 });
  }

  const email = rawEmail.trim().toLowerCase();
  if (
    !(await rateLimitPersistent(`signup-email:${email}`, 3, 60 * 60_000)) ||
    !(await rateLimitPersistent(`signup-ip:${clientIp(request)}`, 20, 60 * 60_000))
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const lang = ALLOWED_LANGUAGES.includes(preferred_language) ? preferred_language : "en";

  // An existing customer (e.g. added by an admin) must never be taken over or
  // overwritten by an unauthenticated signup. Reply neutrally and email the
  // address owner a link to set a password.
  const existingCustomer = await getCustomerByEmail(email);
  if (existingCustomer) {
    await sendSetPasswordLink(email, existingCustomer.preferred_language ?? lang);
    return NextResponse.json({ ok: true });
  }

  // New account: created unconfirmed with the chosen password. It only becomes
  // usable once the owner of the mailbox clicks the emailed link.
  const supabaseAdmin = createAdminClient();
  const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
  });
  if (linkError) {
    if (isEmailExistsError(linkError)) {
      // Auth user exists without a customer record: same neutral answer.
      await sendSetPasswordLink(email, lang);
      return NextResponse.json({ ok: true });
    }
    console.error("[signup] Failed to create auth user:", linkError);
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }

  try {
    await upsertCustomerByEmail({
      customer_type: "individual",
      source: source ?? "Website checkout",
      customer_name: name,
      email,
      address_line1,
      address_city,
      address_postal_code,
      country,
      preferred_language: lang,
      is_activated: true,
    });
  } catch (err) {
    console.error("[signup] Failed to create customer record:", err);
    return NextResponse.json({ error: "Could not create customer record" }, { status: 500 });
  }

  const tokenHash = data?.properties?.hashed_token;
  if (!tokenHash) {
    console.error("[signup] generateLink returned no token");
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
  await sendAccountLink(email, lang, {
    kind: "confirm",
    link: confirmLink(tokenHash, "signup", "/portal/dashboard"),
  }).catch((err) => console.error("[signup] confirmation email failed:", err));

  return NextResponse.json({ ok: true });
}
