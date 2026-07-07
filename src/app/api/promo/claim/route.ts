import { NextRequest, NextResponse } from "next/server";
import { claimLead } from "@/lib/db/leads";

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const result = await claimLead(token);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (result.isUsed) {
    return NextResponse.json({ error: "Already used" }, { status: 409 });
  }

  return NextResponse.json({ claimedAt: result.claimedAt });
}
