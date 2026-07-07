import { NextRequest, NextResponse } from "next/server";
import { getLocationBySlug } from "@/lib/db/locations";
import { upsertOtp } from "@/lib/db/loyalty";
import { sendSms } from "@/lib/sms";

export async function POST(request: NextRequest) {
  const { phone, slug } = await request.json();

  if (!phone || !slug) {
    return NextResponse.json({ error: "Missing phone or slug" }, { status: 400 });
  }

  const location = await getLocationBySlug(slug);
  if (!location || !location.has_loyalty_enabled) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const code = String(Math.floor(1000 + Math.random() * 9000));
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
