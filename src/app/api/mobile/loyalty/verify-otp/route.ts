import { NextRequest, NextResponse } from "next/server";
import { verifyLoyaltyOtp } from "@/lib/loyalty-auth";
import { signMobileToken } from "@/lib/mobile-session";
import { clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { phone, code, slug } = await request.json().catch(() => ({}));

  const result = await verifyLoyaltyOtp(phone, code, slug, clientIp(request));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const token = await signMobileToken({
    phone: result.data.phone,
    locationId: result.data.locationId,
  });

  return NextResponse.json({
    ok: true,
    token,
    stamps: result.data.stamps,
    reward_ready: result.data.rewardReady,
  });
}
