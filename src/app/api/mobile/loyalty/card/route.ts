import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobile-session";
import { getLoyaltyCard } from "@/lib/db/loyalty";
import { getLocationBySlug } from "@/lib/db/locations";
import { REDEEM_WINDOW_MS } from "@/lib/loyalty-collect";

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

  // Lets the app resume an in-progress redemption (with the correct
  // countdown) after a refresh/relaunch, instead of only surfacing it right
  // after the claim tap.
  let redeem: { code: string; expires_at: string } | null = null;
  if (card?.redeem_code && card.redeem_requested_at && !card.redeem_used_at) {
    const requestedAtMs = new Date(card.redeem_requested_at).getTime();
    if (Date.now() - requestedAtMs < REDEEM_WINDOW_MS) {
      redeem = { code: card.redeem_code, expires_at: new Date(requestedAtMs + REDEEM_WINDOW_MS).toISOString() };
    }
  }

  return NextResponse.json({ stamps, reward_ready: stamps >= maxStamps, max_stamps: maxStamps, redeem });
}
