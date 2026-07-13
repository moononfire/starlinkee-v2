import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobile-session";
import { getLocationBySlug } from "@/lib/db/locations";
import { collectLoyaltyStamp } from "@/lib/loyalty-collect";

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  const session = token ? await verifyMobileToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { slug, scanToken } = await request.json().catch(() => ({ slug: undefined, scanToken: undefined }));

  const location = slug ? await getLocationBySlug(String(slug)) : null;
  if (!location || !location.has_loyalty_enabled) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const result = await collectLoyaltyStamp(location.location_id, session.phone, scanToken);
  if (!result.ok) {
    const body: Record<string, unknown> = { error: result.error };
    if (result.error === "cooldown") body.remaining_seconds = result.remainingSeconds;
    return NextResponse.json(body, { status: result.status });
  }

  return NextResponse.json({ stamps: result.stamps, reward_ready: result.rewardReady });
}
