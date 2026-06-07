import { NextRequest, NextResponse } from "next/server";
import { getLeadByToken, markLeadAsUsed } from "@/lib/db/leads";

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const lead = await getLeadByToken(token);
  if (!lead) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (lead.is_used) {
    return NextResponse.json({ error: "Already used" }, { status: 409 });
  }

  await markLeadAsUsed(lead.id);

  return NextResponse.json({ ok: true });
}
