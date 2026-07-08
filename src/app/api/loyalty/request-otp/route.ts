import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { getLocationBySlug } from "@/lib/db/locations";
import { upsertOtp } from "@/lib/db/loyalty";
import { sendSms } from "@/lib/sms";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";

const PHONE_PATTERN = /^\+?[0-9 ()-]{6,20}$/;

export async function POST(request: NextRequest) {
  const { phone: rawPhone, slug } = await request.json();

  if (!rawPhone || !slug) {
    return NextResponse.json({ error: "Missing phone or slug" }, { status: 400 });
  }

  if (typeof rawPhone !== "string" || !PHONE_PATTERN.test(rawPhone)) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const phone = normalizePhone(rawPhone);

  // Each request sends a paid SMS — throttle per phone and per IP.
  if (
    !rateLimit(`otp-req-phone:${phone}`, 3, 15 * 60_000) ||
    !rateLimit(`otp-req-ip:${clientIp(request)}`, 10, 15 * 60_000)
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const location = await getLocationBySlug(slug);
  if (!location || !location.has_loyalty_enabled) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const code = String(randomInt(1000, 10000));
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

  try {
    await upsertOtp(location.location_id, phone, code, expiresAt);
    await sendSms(phone, `Twój kod weryfikacyjny: ${code}`);
  } catch (err) {
    console.error("Failed to send OTP", err);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
