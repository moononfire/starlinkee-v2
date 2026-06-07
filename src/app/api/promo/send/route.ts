import { NextRequest, NextResponse } from "next/server";
import { getLocationBySlug } from "@/lib/db/locations";
import { checkLeadExists, createLead } from "@/lib/db/leads";
import { sendSms } from "@/lib/sms";
import { sendPromoEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const { phone, email, agreed, slug } = await request.json();

  if (!phone || !slug || !agreed) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const location = await getLocationBySlug(slug);
  if (!location || !location.has_promo_enabled) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const exists = await checkLeadExists(location.location_id, phone);
  if (exists) {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  const claimToken = crypto.randomUUID();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const claimUrl = `${appUrl}/l/${slug}/promo/claim/${claimToken}`;

  try {
    await createLead(location.location_id, phone, email ?? null, agreed, claimToken);

    const smsText = location.promo_sms_text
      ? `${location.promo_sms_text} ${claimUrl}`
      : `Twoja promocja od ${location.location_name}: ${claimUrl}`;

    await sendSms(phone, smsText);

    if (email) {
      sendPromoEmail(email, {
        locationName: location.location_name,
        claimUrl,
        smsText: location.promo_sms_text ?? `Twoja promocja od ${location.location_name}`,
      }).catch(() => {});
    }
  } catch {
    return NextResponse.json({ error: "Failed to process promo" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
