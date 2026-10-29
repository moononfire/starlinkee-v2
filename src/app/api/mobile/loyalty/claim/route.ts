import { isLocationActive, SUBSCRIPTION_INACTIVE } from "@/lib/location-access";
import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobile-session";
import { getLocationBySlug } from "@/lib/db/locations";
import { claimLoyaltyReward } from "@/lib/loyalty-collect";

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  const session = token ? await verifyMobileToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { slug } = await request.json().catch(() => ({ slug: undefined }));

  const location = slug ? await getLocationBySlug(String(slug)) : null;
  if (!location || !location.has_loyalty_enabled) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }
  if (!(await isLocationActive(location))) {
    return NextResponse.json(SUBSCRIPTION_INACTIVE, { status: 403 });
  }

  const result = await claimLoyaltyReward(location.location_id, session.phone);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, code: result.code, expires_at: result.expiresAt });
}
