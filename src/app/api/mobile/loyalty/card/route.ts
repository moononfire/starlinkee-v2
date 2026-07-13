import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobile-session";
import { getLoyaltyCard } from "@/lib/db/loyalty";
import { getLocationById } from "@/lib/db/locations";

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  const session = token ? await verifyMobileToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const location = await getLocationById(session.locationId);
  const maxStamps = location?.loyalty_stamps_required ?? 10;
  const card = await getLoyaltyCard(session.locationId, session.customerUserId);
  const stamps = card?.stamps_count ?? 0;

  return NextResponse.json({ stamps, reward_ready: stamps >= maxStamps, max_stamps: maxStamps });
}
