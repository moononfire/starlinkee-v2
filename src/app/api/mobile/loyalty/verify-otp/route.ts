import { NextRequest, NextResponse } from "next/server";
import { verifyLoyaltyOtp } from "@/lib/loyalty-auth";
import { signMobileToken } from "@/lib/mobile-session";
import { linkLoyaltyEmail } from "@/lib/db/loyalty";
import { clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { phone, code, email } = await request.json().catch(() => ({}));

  const result = await verifyLoyaltyOtp(phone, code, clientIp(request));
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Best-effort bookkeeping — the Google email isn't checked against
  // anything, so a failure here shouldn't block the actual login.
  if (typeof email === "string" && email) {
    try {
      await linkLoyaltyEmail(result.data.phone, email);
    } catch (err) {
      console.error("Failed to link loyalty email", err);
    }
  }

  const token = await signMobileToken({ phone: result.data.phone });

  return NextResponse.json({ ok: true, token });
}
