import { NextRequest, NextResponse } from "next/server";
import { verifyLoyaltyOtp } from "@/lib/loyalty-auth";
import { setLoyaltySession } from "@/lib/session";
import { clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { phone, code, slug } = await request.json();

  const result = await verifyLoyaltyOtp(phone, code, slug, clientIp(request));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await setLoyaltySession(result.data.phone, result.data.locationId);

  return NextResponse.json({ ok: true, stamps: result.data.stamps, reward_ready: result.data.rewardReady });
}
