import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { setSubscriptionActive } from "@/lib/db/subscriptions";
import { createLocation } from "@/lib/db/locations";
import { uploadLogo } from "@/lib/storage";
import { sendPlateSetupConfirmation } from "@/lib/email";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await getCustomerByEmail(user.email);
  if (!customer)
    return NextResponse.json({ error: "Customer not found" }, { status: 401 });

  const form = await request.formData();
  const subscriptionId = Number(form.get("subscription_id"));
  const locationName = form.get("location_name") as string;
  const supportEmail = form.get("support_email") as string;

  if (!subscriptionId || !locationName?.trim() || !supportEmail?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const subscription = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!subscription)
    return NextResponse.json({ error: "Subscription not found" }, { status: 403 });
  if (subscription.status !== "pending")
    return NextResponse.json({ error: "Subscription is not pending" }, { status: 400 });

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

  await createLocation({
    subscription_id: subscriptionId,
    location_name: locationName.trim(),
    google_business_name: (form.get("google_business_name") as string) || undefined,
    google_business_address: (form.get("google_business_address") as string) || undefined,
    google_review_link: (form.get("google_review_link") as string) || undefined,
    google_places_id: (form.get("google_places_id") as string) || undefined,
    support_email: supportEmail.trim(),
    logo_path: logoPath,
    logo_link: logoLink,
    owner_email: supportEmail.trim(),
  });

  const now = new Date();
  const expiration = new Date(now);
  expiration.setDate(expiration.getDate() + subscription.duration_in_days);
  await setSubscriptionActive(subscriptionId, now.toISOString(), expiration.toISOString());

  await sendPlateSetupConfirmation(supportEmail.trim(), customer.preferred_language, {
    locationName: locationName.trim(),
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
