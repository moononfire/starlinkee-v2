import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getLocationBySlug } from "@/lib/db/locations";
import { getOtp, deleteOtp } from "@/lib/db/loyalty";
import { setLoyaltySession } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const { phone, code, slug } = await request.json();

  if (!phone || !code || !slug) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // A 4-digit code is brute-forceable — cap verification attempts.
  if (
    !rateLimit(`otp-verify-phone:${phone}`, 5, 10 * 60_000) ||
    !rateLimit(`otp-verify-ip:${clientIp(request)}`, 20, 10 * 60_000)
  ) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const location = await getLocationBySlug(slug);
  if (!location || !location.has_loyalty_enabled) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const otp = await getOtp(location.location_id, phone);
  if (!otp) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  if (new Date(otp.expires_at) < new Date()) {
    return NextResponse.json({ error: "Code expired" }, { status: 401 });
  }

  const storedBuf = Buffer.from(otp.otp_code);
  const submittedBuf = Buffer.from(String(code).padEnd(storedBuf.length));
  const match =
    storedBuf.length === submittedBuf.length &&
    timingSafeEqual(storedBuf, submittedBuf);

  if (!match) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  await deleteOtp(location.location_id, phone);
  await setLoyaltySession(phone, location.location_id);

  return NextResponse.json({ ok: true });
}
