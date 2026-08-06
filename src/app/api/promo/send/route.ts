import { NextRequest, NextResponse } from "next/server";
import { getLocationBySlug } from "@/lib/db/locations";
import { checkLeadExists, createLead, generateCouponCode } from "@/lib/db/leads";
import { validateScanToken } from "@/lib/db/scan-tokens";
import { sendSms } from "@/lib/sms";
import { sendPromoEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getPromoText } from "@/lib/promo-i18n";
import { t } from "@/lib/translations";

const PHONE_PATTERN = /^\+?[0-9 ()-]{6,20}$/;

export async function POST(request: NextRequest) {
  const { phone, email, agreed, slug, scanToken, lang } = await request.json();

  if (!phone || !slug || !agreed) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (typeof phone !== "string" || !PHONE_PATTERN.test(phone)) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  if (!scanToken) {
    return NextResponse.json({ error: "Scan token required" }, { status: 403 });
  }

  // Each accepted request sends a paid SMS — one scan should yield one promo,
  // not a fan-out to arbitrary numbers within the token's lifetime.
  if (
    !rateLimit(`promo-token:${scanToken}`, 3, 10 * 60_000) ||
    !rateLimit(`promo-ip:${clientIp(request)}`, 5, 10 * 60_000)
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const location = await getLocationBySlug(slug);
  if (!location || !location.has_promo_enabled) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const scanResult = await validateScanToken(scanToken);
  if (!scanResult.valid || scanResult.locationId !== location.location_id) {
    return NextResponse.json({ error: "Invalid or expired scan token" }, { status: 403 });
  }

  const exists = await checkLeadExists(location.location_id, phone);
  if (exists) {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  const claimToken = crypto.randomUUID();
  const couponCode = generateCouponCode();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const claimUrl = `${appUrl}/l/${slug}/promo/claim/${claimToken}`;

  try {
    await createLead(location.location_id, phone, email ?? null, agreed, claimToken, couponCode);

    const currentLang = typeof lang === "string" ? lang : "pl";
    const localizedSmsText = getPromoText(location, currentLang, "promo_sms_text");
    const defaultSms = t("portal_promo_sms_placeholder", currentLang);

    const baseSmsText = localizedSmsText || defaultSms;
    const smsText = baseSmsText.includes("{link}")
      ? baseSmsText.replace("{link}", claimUrl)
      : `${baseSmsText} ${claimUrl}`;

    await sendSms(phone, smsText);

    if (email) {
      sendPromoEmail(email, {
        locationName: location.location_name,
        claimUrl,
        smsText: baseSmsText.includes("{link}") ? baseSmsText.replace("{link}", "") : baseSmsText,
      }).catch(() => {});
    }
  } catch {
    return NextResponse.json({ error: "Failed to process promo" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
