import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-session";
import { updateCustomer } from "@/lib/db/customers";
import { SUPPORTED_LANGUAGES, type Language } from "@/lib/languages";

// The owner's language choice lives on the customer, so it follows them to every device and decides the e-mail language too.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { user, customer } = await getPortalSession();
  if (!user || !customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await request.json().catch(() => null);
  const lang = parsed?.lang;
  if (typeof lang !== "string" || !SUPPORTED_LANGUAGES.includes(lang as Language)) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }

  try {
    await updateCustomer(customer.customer_id, { preferred_language: lang as Language });
  } catch (err) {
    console.error(`[portal language] customer ${customer.customer_id}:`, err);
    return NextResponse.json({ error: "Could not save the language" }, { status: 500 });
  }
  return NextResponse.json({ lang });
}
