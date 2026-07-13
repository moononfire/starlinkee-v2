import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobile-session";
import { getLoyaltyCard } from "@/lib/db/loyalty";
import { getLocationBySlug } from "@/lib/db/locations";

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  const session = token ? await verifyMobileToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get("slug");
  const location = slug ? await getLocationBySlug(slug) : null;
  if (!location || !location.has_loyalty_enabled) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const maxStamps = location.loyalty_stamps_required ?? 10;
  const card = await getLoyaltyCard(location.location_id, session.phone);
  const stamps = card?.stamps_count ?? 0;

  return NextResponse.json({ stamps, reward_ready: stamps >= maxStamps, max_stamps: maxStamps });
}
