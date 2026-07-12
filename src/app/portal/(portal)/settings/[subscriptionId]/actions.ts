"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { updateLocation, upsertLocationLinks } from "@/lib/db/locations";
import { isSafeHttpUrl } from "@/lib/urls";
import { SUPPORTED_LANGUAGES } from "@/lib/language";
import { isLinkIconKey } from "@/lib/linkIcons";
import { isTileBackgroundKey } from "@/lib/linkBackgrounds";
import { isPageBackgroundKey } from "@/lib/pageBackgrounds";

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

async function getOwnedLocation(
  customerId: number,
  subscriptionId: number,
  locationId: number
) {
  const subscriptions = await getCustomerSubscriptions(customerId);
  const sub = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!sub?.location || sub.location.location_id !== locationId) return null;
  return sub.location;
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
  redirect(`${dest}/settings?saved=location_name`);
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
  const pageBackground = formData.get("page_background") as string | null;

  const dest = `/portal/${subscriptionId}`;
  if (!subscriptionId || !locationId || !linksJson) redirect(dest);

  const location = await getOwnedLocation(customer.customer_id, subscriptionId, locationId);
  if (!location) redirect(dest);

  const primaryLang = SUPPORTED_LANGUAGES.find((l) => location.active_languages.includes(l)) ?? "pl";
  const primaryField = `title_${primaryLang}` as const;

  let rawLinks: { title_pl: string; title_en: string; title_de: string; url: string; icon?: string | null; background?: string | null }[];
  try {
    rawLinks = JSON.parse(linksJson);
    if (!Array.isArray(rawLinks)) throw new Error();
  } catch {
    redirect(dest);
  }

  const links = rawLinks
    .slice(0, 7)
    .filter((l) => l[primaryField]?.trim() && l.url?.trim() && isSafeHttpUrl(l.url.trim()))
    .map((l, i) => {
      const title_pl = l.title_pl?.trim() || null;
      const title_en = l.title_en?.trim() || null;
      const title_de = l.title_de?.trim() || null;
      return {
        title: l[primaryField].trim(),
        title_pl,
        title_en,
        title_de,
        url: l.url.trim(),
        icon: isLinkIconKey(l.icon) ? l.icon : null,
        background: isTileBackgroundKey(l.background) ? l.background : null,
        sort_order: i,
      };
    });

  await upsertLocationLinks(locationId, links);
  await updateLocation(locationId, {
    page_background: isPageBackgroundKey(pageBackground) ? pageBackground : null,
  });
  redirect(`${dest}/settings?saved=linktree_links`);
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
  redirect(`${dest}/settings?saved=support_email`);
}

export async function updateActiveLanguages(formData: FormData) {
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

  const dest = `/portal/${subscriptionId}`;
  if (!subscriptionId || !locationId) redirect(dest);

  const ok = await verifyOwnership(customer.customer_id, subscriptionId, locationId);
  if (!ok) redirect(dest);

  const selected = SUPPORTED_LANGUAGES.filter((l) => formData.get(`lang_${l}`) === "on");
  if (selected.length === 0) {
    // Minimum jeden aktywny język musi zostać — odrzucamy zmianę.
    redirect(`${dest}/settings`);
  }

  await updateLocation(locationId, { active_languages: selected });
  redirect(`${dest}/settings?saved=active_languages`);
}
