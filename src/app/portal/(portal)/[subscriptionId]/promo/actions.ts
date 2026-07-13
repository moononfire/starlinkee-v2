"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { updateLocation } from "@/lib/db/locations";

function makeSupabase(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
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
}

async function verifyOwnership(
  customerId: number,
  subscriptionId: number,
  locationId: number
) {
  const subscriptions = await getCustomerSubscriptions(customerId);
  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub?.location || sub.location.location_id !== locationId) return false;
  return true;
}

export async function updatePromoEnabled(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = makeSupabase(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const customer = await getCustomerByEmail(user.email);
  if (!customer) redirect("/portal/login");

  const subscriptionId = Number(formData.get("subscription_id"));
  const locationId = Number(formData.get("location_id"));
  const enabled = formData.get("has_promo_enabled") === "on";

  const dest = `/portal/${subscriptionId}/promo`;
  if (!subscriptionId || !locationId) redirect(dest);

  const ok = await verifyOwnership(customer.customer_id, subscriptionId, locationId);
  if (!ok) redirect(`/portal/${subscriptionId}`);

  await updateLocation(locationId, { has_promo_enabled: enabled });

  redirect(`${dest}?saved=1`);
}

export async function updatePromoSettings(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = makeSupabase(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const customer = await getCustomerByEmail(user.email);
  if (!customer) redirect("/portal/login");

  const subscriptionId = Number(formData.get("subscription_id"));
  const locationId = Number(formData.get("location_id"));
  const field = (name: string) => (formData.get(name) as string)?.trim() || null;

  const dest = `/portal/${subscriptionId}/promo`;
  if (!subscriptionId || !locationId) redirect(dest);

  const ok = await verifyOwnership(customer.customer_id, subscriptionId, locationId);
  if (!ok) redirect(`/portal/${subscriptionId}`);

  await updateLocation(locationId, {
    promo_description: field("promo_description"),
    promo_description_en: field("promo_description_en"),
    promo_description_de: field("promo_description_de"),
    promo_banner_text: field("promo_banner_text"),
    promo_banner_text_en: field("promo_banner_text_en"),
    promo_banner_text_de: field("promo_banner_text_de"),
    promo_sms_text: field("promo_sms_text"),
    promo_sms_text_en: field("promo_sms_text_en"),
    promo_sms_text_de: field("promo_sms_text_de"),
  });

  redirect(`${dest}?saved=1`);
}
