import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getPlateById, assignPlateToSubscription } from "@/lib/db/plates";
import { createSubscription, setSubscriptionActive } from "@/lib/db/subscriptions";
import { upsertCustomerByEmail } from "@/lib/db/customers";
import { createLocation, upsertLocationLinks } from "@/lib/db/locations";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRandomPassword } from "@/lib/password";
import { sendQuickPlateCredentialsToAdmin } from "@/lib/email";
import { uploadLogo } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const form = await request.formData();
  const plateId = parseInt(form.get("plate_id") as string);
  const businessName = (form.get("business_name") as string)?.trim();
  const businessAddress = (form.get("business_address") as string)?.trim() || undefined;
  const googleReviewLink = (form.get("google_review_link") as string)?.trim();
  const googlePlacesId = (form.get("google_places_id") as string)?.trim() || undefined;
  const email = (form.get("email") as string)?.trim().toLowerCase();
  const logoIsRound = (form.get("logo_is_round") as string) !== "false";
  const durationStr = form.get("duration") as string;
  const TRIAL_DAYS = durationStr ? parseInt(durationStr, 10) : 33;

  const website = (form.get("website") as string)?.trim() || undefined;
  const menuLink = (form.get("menu_link") as string)?.trim() || undefined;
  const facebook = (form.get("facebook") as string)?.trim() || undefined;
  const instagram = (form.get("instagram") as string)?.trim() || undefined;

  if (!plateId || !businessName || !email || !googleReviewLink) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validDurations = [8, 15, 33];
  if (!validDurations.includes(TRIAL_DAYS)) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  const plate = await getPlateById(plateId);
  if (!plate) {
    return NextResponse.json({ error: "Plate not found" }, { status: 404 });
  }
  if (plate.subscription_id) {
    return NextResponse.json({ error: "Plate is already assigned" }, { status: 400 });
  }

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

  try {
    const customerId = await upsertCustomerByEmail({
      customer_type: "business",
      source: "Quick plate activation",
      customer_name: businessName,
      email,
      preferred_language: "pl",
      is_activated: true,
    });

    const subscription = await createSubscription({
      customer_id: customerId,
      subscription_name: `${TRIAL_DAYS}_DAYS_TRIAL_FREE`,
      duration_in_days: TRIAL_DAYS,
      is_free: true,
    });

    await assignPlateToSubscription(plate.plate_id, subscription.subscription_id);

    await createLocation({
      subscription_id: subscription.subscription_id,
      location_name: businessName,
      google_business_name: businessName,
      google_business_address: businessAddress,
      google_review_link: googleReviewLink,
      google_places_id: googlePlacesId,
      support_email: email,
      owner_email: email,
      logo_path: logoPath,
      logo_link: logoLink,
      logo_is_round: logoIsRound,
      has_menu_enabled: !!menuLink,
      menu_link: menuLink,
      menu_type: menuLink ? "link" : undefined,
    });

    const links = [];
    if (website) {
      links.push({ title: "Strona WWW", url: website, icon: "globe", sort_order: 1 });
    }
    if (facebook) {
      links.push({ title: "Facebook", url: facebook, icon: "facebook", sort_order: 2 });
    }
    if (instagram) {
      links.push({ title: "Instagram", url: instagram, icon: "instagram", sort_order: 3 });
    }
    if (links.length > 0) {
      await upsertLocationLinks(location.location_id, links);
    }

    const now = new Date();
    const expiration = new Date(now);
    expiration.setDate(expiration.getDate() + TRIAL_DAYS);
    await setSubscriptionActive(subscription.subscription_id, now.toISOString(), expiration.toISOString());

    const supabaseAdmin = createAdminClient();
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAccount = existingUsers?.users?.some((u) => u.email === email) ?? false;

    let portalPassword: string | null = null;
    if (!existingAccount) {
      portalPassword = generateRandomPassword();
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: portalPassword,
        email_confirm: true,
      });
      if (createError) {
        console.error("[quick-activate] Failed to create portal user:", createError);
        portalPassword = null;
      }
    }

    try {
      await sendQuickPlateCredentialsToAdmin({
        plateNumber: plate.plate_number,
        businessName,
        businessAddress,
        googleReviewLink,
        customerEmail: email,
        portalPassword,
        existingAccount,
      });
    } catch (err) {
      console.error("[quick-activate] Failed to send admin email:", err);
    }

    return NextResponse.json({
      ok: true,
      plateNumber: plate.plate_number,
      googleReviewLink,
    });
  } catch (err) {
    console.error("[quick-activate] Failed:", err);
    const msg = err instanceof Error ? err.message : "Quick activation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
