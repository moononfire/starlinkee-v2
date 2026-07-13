import { NextRequest, NextResponse } from "next/server";
import { requestLoyaltyOtp } from "@/lib/loyalty-auth";
import { clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { phone } = await request.json().catch(() => ({}));

  const result = await requestLoyaltyOtp(phone, clientIp(request));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
