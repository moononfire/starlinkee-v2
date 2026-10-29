import { NextRequest, NextResponse } from "next/server";
import { claimLead, getLeadByToken } from "@/lib/db/leads";
import { isLocationActiveById, SUBSCRIPTION_INACTIVE } from "@/lib/location-access";

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const lead = await getLeadByToken(token);
  if (lead && !(await isLocationActiveById(lead.location_id))) {
    return NextResponse.json(SUBSCRIPTION_INACTIVE, { status: 403 });
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
