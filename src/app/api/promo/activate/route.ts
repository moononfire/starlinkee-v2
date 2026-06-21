import { NextRequest, NextResponse } from "next/server";
import { getLeadByToken, getLeadByCouponCode, markLeadAsUsed } from "@/lib/db/leads";

export async function POST(request: NextRequest) {
  const { token, code } = await request.json();

  if (!token && !code) {
    return NextResponse.json({ error: "Missing token or code" }, { status: 400 });
  }

  const lead = code
    ? await getLeadByCouponCode(code.toUpperCase())
    : await getLeadByToken(token);

  if (!lead) {
    return NextResponse.json({ error: "Invalid" }, { status: 404 });
  }

  if (lead.is_used) {
    return NextResponse.json({ error: "Already used" }, { status: 409 });
  }

  await markLeadAsUsed(lead.id);

  return NextResponse.json({ ok: true });
}
