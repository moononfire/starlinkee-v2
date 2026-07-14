import { NextRequest, NextResponse } from "next/server";
import { signMobileToken } from "@/lib/mobile-session";
import { normalizePhone } from "@/lib/phone";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const PHONE_PATTERN = /^\+?[0-9 ()-]{6,20}$/;

// Android-only path: the app picks the number from Android's Phone Number
// Hint API (Google Play Services) instead of an SMS OTP. There is no proof
// of ownership here — a shared/multi-SIM device could pick another
// person's number — accepted trade-off for a free, low-stakes login (loyalty
// stamps, not payments). iOS keeps the SMS OTP flow (request-otp/verify-otp).
export async function POST(request: NextRequest) {
  const { phone: rawPhone } = await request.json().catch(() => ({}));

  if (!rawPhone || typeof rawPhone !== "string" || !PHONE_PATTERN.test(rawPhone)) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  if (
    !rateLimit(`phone-hint-phone:${rawPhone}`, 10, 15 * 60_000) ||
    !rateLimit(`phone-hint-ip:${clientIp(request)}`, 30, 15 * 60_000)
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const phone = normalizePhone(rawPhone);
  const token = await signMobileToken({ phone });

  return NextResponse.json({ ok: true, token });
}
