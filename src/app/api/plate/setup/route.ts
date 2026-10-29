import { ownerLanguage } from "@/lib/languages";
import { NextRequest, NextResponse } from "next/server";
import { getPlateByNumber } from "@/lib/db/plates";
import { getSubscriptionById, setSubscriptionActive } from "@/lib/db/subscriptions";
import { getCustomerById } from "@/lib/db/customers";
import { createLocation } from "@/lib/db/locations";
import { uploadLogo } from "@/lib/storage";
import { isSafeGoogleReviewUrl } from "@/lib/urls";
import { sendPlateSetupConfirmation } from "@/lib/email";
import { verifyActivationCode } from "@/lib/activation-code";
import { clientIp } from "@/lib/rate-limit";
import { rateLimitPersistent } from "@/lib/rate-limit-persistent";
import { safeEqual } from "@/lib/secure-compare";

export async function POST(request: NextRequest) {
  const form = await request.formData();

  const plateNumber = form.get("plateNumber") as string;
  const plateSecret = form.get("plateSecret") as string;
  const locationName = form.get("location_name") as string;
  const googleReviewLink = (form.get("google_review_link") as string) || undefined;
  const googlePlacesId = (form.get("google_places_id") as string) || undefined;
  const supportEmail = form.get("support_email") as string;

  if (!plateNumber || !plateSecret || !locationName || !supportEmail) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (googleReviewLink && !isSafeGoogleReviewUrl(googleReviewLink)) {
    return NextResponse.json({ error: "Invalid Google review link" }, { status: 400 });
  }

  // Re-verify plate and secret
  const plate = await getPlateByNumber(plateNumber);
  if (!plate || !safeEqual(plateSecret, plate.secret_key)) {
    return NextResponse.json({ error: "Invalid plate" }, { status: 403 });
  }

  if (!plate.subscription_id) {
    return NextResponse.json({ error: "Plate has no subscription" }, { status: 400 });
  }

  const subscription = await getSubscriptionById(plate.subscription_id);
  if (!subscription || subscription.status !== "pending") {
    return NextResponse.json({ error: "Subscription is not pending" }, { status: 400 });
  }

  // The plate secret is printed on the plate (and was publicly leaked), so
  // setting up a pending subscription also needs the activation code that was
  // emailed to the customer when the plate was assigned to them.
  if (
    !(await rateLimitPersistent(`plate-setup-code:${plate.plate_number}`, 5, 15 * 60_000)) ||
    !(await rateLimitPersistent(`plate-setup-ip:${clientIp(request)}`, 20, 15 * 60_000))
  ) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }
  if (!verifyActivationCode(form.get("activation_code"), subscription.activation_code_hash)) {
    return NextResponse.json({ error: "Invalid activation code" }, { status: 403 });
  }

  // Upload logo if provided
  let logoPath: string | undefined;
  let logoLink: string | undefined;
  const logoFile = form.get("logo") as File | null;
  if (logoFile && logoFile.size > 0) {
    try {
      const { path, publicUrl } = await uploadLogo(logoFile);
      logoPath = path;
      logoLink = publicUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Logo upload failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  // Create location
  await createLocation({
    subscription_id: plate.subscription_id,
    location_name: locationName,
    google_business_name: (form.get("google_business_name") as string) || undefined,
    google_business_address: (form.get("google_business_address") as string) || undefined,
    google_review_link: googleReviewLink,
    google_places_id: googlePlacesId,
    support_email: supportEmail,
    logo_path: logoPath,
    logo_link: logoLink,
    owner_email: supportEmail,
  });

  // Activate subscription
  const now = new Date();
  const expiration = new Date(now);
  expiration.setDate(expiration.getDate() + subscription.duration_in_days);

  await setSubscriptionActive(
    plate.subscription_id,
    now.toISOString(),
    expiration.toISOString()
  );

  // Send confirmation email (non-blocking) — language follows the customer's
  // preference from the clients table, not the plate's own language
  const customer = await getCustomerById(subscription.customer_id);
  await sendPlateSetupConfirmation(supportEmail, ownerLanguage(customer, plate), {
    locationName,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
