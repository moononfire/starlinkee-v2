"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { updateLocation, upsertLocationLinks } from "@/lib/db/locations";

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

export async function updateLocationName(formData: FormData) {
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
  const locationName = (formData.get("location_name") as string)?.trim();

  const dest = `/portal/${subscriptionId}`;
  if (!subscriptionId || !locationId || !locationName) redirect(dest);

  const ok = await verifyOwnership(customer.customer_id, subscriptionId, locationId);
  if (!ok) redirect(dest);

  await updateLocation(locationId, { location_name: locationName });
  redirect(`${dest}?saved=1`);
}

export async function upsertLinktreeLinks(formData: FormData) {
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
  const linksJson = formData.get("links_json") as string;

  const dest = `/portal/${subscriptionId}`;
  if (!subscriptionId || !locationId || !linksJson) redirect(dest);

  const ok = await verifyOwnership(customer.customer_id, subscriptionId, locationId);
  if (!ok) redirect(dest);

  let rawLinks: { title: string; url: string }[];
  try {
    rawLinks = JSON.parse(linksJson);
    if (!Array.isArray(rawLinks)) throw new Error();
  } catch {
    redirect(dest);
  }

  const links = rawLinks
    .slice(0, 7)
    .filter((l) => l.title?.trim() && l.url?.trim())
    .map((l, i) => ({
      title: l.title.trim(),
      title_pl: l.title.trim(),
      url: l.url.trim(),
      sort_order: i,
    }));

  await upsertLocationLinks(locationId, links);
  redirect(`${dest}?saved=1`);
}

export async function updateSupportEmail(formData: FormData) {
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
  const supportEmail = (formData.get("support_email") as string)?.trim();

  const dest = `/portal/${subscriptionId}`;
  if (!subscriptionId || !locationId || !supportEmail) redirect(dest);

  const ok = await verifyOwnership(customer.customer_id, subscriptionId, locationId);
  if (!ok) redirect(dest);

  await updateLocation(locationId, {
    support_email: supportEmail,
    owner_email: supportEmail,
  });
  redirect(`${dest}?saved=1`);
}
