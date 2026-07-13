import { NextResponse } from "next/server";
import { getLoyaltySession } from "@/lib/session";
import { claimLoyaltyReward } from "@/lib/loyalty-collect";

export async function POST() {
  const session = await getLoyaltySession();
  if (!session.customerUserId || !session.locationId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const result = await claimLoyaltyReward(session.locationId, session.customerUserId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, stamps: result.stamps });
}
