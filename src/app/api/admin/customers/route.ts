import { NextRequest, NextResponse } from "next/server";
import { updateCustomer } from "@/lib/db/customers";
import { requireAdmin } from "@/lib/api-auth";

// Only the fields the admin form edits; anything else (stripe ids, ...) is rejected.
const EDITABLE_FIELDS = [
  "customer_type",
  "customer_name",
  "email",
  "phone",
  "company_name",
  "tax_id",
  "billing_address",
  "country",
  "preferred_language",
  "is_activated",
];

export async function PUT(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await req.json();
  const { customer_id, ...updates } = body;

  if (!customer_id) {
    return NextResponse.json({ error: "customer_id required" }, { status: 400 });
  }

  const unknown = Object.keys(updates).filter((k) => !EDITABLE_FIELDS.includes(k));
  if (unknown.length > 0) {
    return NextResponse.json({ error: `Unknown field(s): ${unknown.join(", ")}` }, { status: 400 });
  }

  const customer = await updateCustomer(customer_id, updates);

  return NextResponse.json({ customer });
}
