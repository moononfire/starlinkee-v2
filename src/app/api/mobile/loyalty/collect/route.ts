import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobile-session";
import { collectLoyaltyStamp } from "@/lib/loyalty-collect";

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  const session = token ? await verifyMobileToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { scanToken } = await request.json().catch(() => ({ scanToken: undefined }));

  const result = await collectLoyaltyStamp(session.locationId, session.phone, scanToken);
  if (!result.ok) {
    const body: Record<string, unknown> = { error: result.error };
    if (result.error === "cooldown") body.remaining_seconds = result.remainingSeconds;
    return NextResponse.json(body, { status: result.status });
  }

  return NextResponse.json({ stamps: result.stamps, reward_ready: result.rewardReady });
}
