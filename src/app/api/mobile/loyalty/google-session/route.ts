import { NextRequest, NextResponse } from "next/server";
import { verifyGoogleSession } from "@/lib/loyalty-google-auth";
import { signMobileToken } from "@/lib/mobile-session";

export async function POST(request: NextRequest) {
  const { supabaseAccessToken, slug } = await request.json().catch(() => ({}));

  const result = await verifyGoogleSession(supabaseAccessToken, slug);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const token = await signMobileToken({
    customerUserId: result.customerUserId,
    email: result.email,
    locationId: result.locationId,
  });

  return NextResponse.json({ ok: true, token, stamps: result.stamps, reward_ready: result.rewardReady });
}
