import { NextRequest, NextResponse } from "next/server";
import { checkWwwKey } from "@/lib/www-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { upsertCustomerByEmail } from "@/lib/db/customers";

const ALLOWED_LANGUAGES = ["en", "de", "pl"] as const;

export async function POST(request: NextRequest) {
  const authError = checkWwwKey(request);
  if (authError) return authError;

  const {
    email,
    password,
    name,
    address_line1,
    address_city,
    address_postal_code,
    country,
    preferred_language,
    source,
  } = await request.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Missing email, password or name" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password too short" }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const alreadyExists = existingUsers?.users?.some((u) => u.email === email);
  if (alreadyExists) {
    return NextResponse.json({ error: "Account already exists" }, { status: 409 });
  }

  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError) {
    console.error("[signup] Failed to create auth user:", createError);
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }

  const lang = ALLOWED_LANGUAGES.includes(preferred_language)
    ? preferred_language
    : "en";

  try {
    const customerId = await upsertCustomerByEmail({
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

    return NextResponse.json({ ok: true, customerId });
  } catch (err) {
    console.error("[signup] Failed to create customer record:", err);
    return NextResponse.json({ error: "Could not create customer record" }, { status: 500 });
  }
}
