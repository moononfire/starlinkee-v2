"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { updateLocation, upsertLocationLinks } from "@/lib/db/locations";
import { isSafeHttpUrl } from "@/lib/urls";
import { SUPPORTED_LANGUAGES } from "@/lib/language";
import { isLinkIconKey } from "@/lib/linkIcons";
import { isTileBackgroundKey } from "@/lib/linkBackgrounds";
import { isPageBackgroundKey } from "@/lib/pageBackgrounds";
import type { ActionResult } from "../../action-result";

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

export async function updateLocationName(formData: FormData): Promise<ActionResult> {
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

  if (!subscriptionId || !locationId || !locationName) return { ok: false, error: "failed" };

  const ok = await verifyOwnership(customer.customer_id, subscriptionId, locationId);
  if (!ok) return { ok: false, error: "failed" };

  await updateLocation(locationId, { location_name: locationName });
  revalidatePath(`/portal/${subscriptionId}`, "layout");
  return { ok: true };
}

export async function upsertLinktreeLinks(formData: FormData): Promise<ActionResult> {
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
  const moduleOrderJson = formData.get("module_order") as string | null;
  const promoBannerJson = formData.get("promo_banner") as string | null;
  const loyaltyBannerJson = formData.get("loyalty_banner") as string | null;
  const wifiBannerJson = formData.get("wifi_banner") as string | null;
  const menuBannerJson = formData.get("menu_banner") as string | null;
  const reviewBannerJson = formData.get("review_banner") as string | null;
  const reviewShowStar = formData.get("review_show_star") === "on";

  if (!subscriptionId || !locationId || !linksJson) return { ok: false, error: "failed" };

  const location = await getOwnedLocation(customer.customer_id, subscriptionId, locationId);
  if (!location) return { ok: false, error: "failed" };

  const primaryLang = SUPPORTED_LANGUAGES.find((l) => location.active_languages.includes(l)) ?? "pl";
  const primaryField = `title_${primaryLang}` as const;

  let rawLinks: { title_pl: string; title_en: string; title_de: string; url: string; icon?: string | null; background?: string | null }[];
  try {
    rawLinks = JSON.parse(linksJson);
    if (!Array.isArray(rawLinks)) throw new Error();
  } catch {
    return { ok: false, error: "failed" };
  }

  const validLinks: any[] = [];
  const indexMapping = new Map<number, number>();

  rawLinks.slice(0, 7).forEach((l, originalIndex) => {
    if (l[primaryField]?.trim() && l.url?.trim() && isSafeHttpUrl(l.url.trim())) {
      const title_pl = l.title_pl?.trim() || null;
      const title_en = l.title_en?.trim() || null;
      const title_de = l.title_de?.trim() || null;
      
      const newIndex = validLinks.length;
      indexMapping.set(originalIndex, newIndex);
      
      validLinks.push({
        title: l[primaryField].trim(),
        title_pl,
        title_en,
        title_de,
        url: l.url.trim(),
        icon: isLinkIconKey(l.icon) ? l.icon : null,
        background: isTileBackgroundKey(l.background) ? l.background : null,
        sort_order: newIndex,
      });
    }
  });

  const links = validLinks;

  const updates: any = {
    page_background: isPageBackgroundKey(pageBackground) ? pageBackground : null,
    review_show_star: reviewShowStar,
  };

  try {
    if (moduleOrderJson) {
      const parsedOrder = JSON.parse(moduleOrderJson);
      if (Array.isArray(parsedOrder)) {
        updates.module_order = parsedOrder
          .map((modId: string) => {
            if (modId.startsWith("link:")) {
              const originalIndex = parseInt(modId.substring(5), 10);
              const newIndex = indexMapping.get(originalIndex);
              return newIndex !== undefined ? `link:${newIndex}` : null;
            }
            return modId;
          })
          .filter(Boolean);
      }
    }
    if (promoBannerJson) {
      const b = JSON.parse(promoBannerJson);
      if (b.pl !== undefined) updates.promo_banner_text = b.pl || null;
      if (b.en !== undefined) updates.promo_banner_text_en = b.en || null;
      if (b.de !== undefined) updates.promo_banner_text_de = b.de || null;
    }
    if (loyaltyBannerJson) {
      const b = JSON.parse(loyaltyBannerJson);
      if (b.pl !== undefined) updates.loyalty_banner_text = b.pl || null;
      if (b.en !== undefined) updates.loyalty_banner_text_en = b.en || null;
      if (b.de !== undefined) updates.loyalty_banner_text_de = b.de || null;
    }
    if (wifiBannerJson) {
      const b = JSON.parse(wifiBannerJson);
      if (b.pl !== undefined) updates.wifi_banner_text = b.pl || null;
      if (b.en !== undefined) updates.wifi_banner_text_en = b.en || null;
      if (b.de !== undefined) updates.wifi_banner_text_de = b.de || null;
    }
    if (menuBannerJson) {
      const b = JSON.parse(menuBannerJson);
      if (b.pl !== undefined) updates.menu_banner_text = b.pl || null;
      if (b.en !== undefined) updates.menu_banner_text_en = b.en || null;
      if (b.de !== undefined) updates.menu_banner_text_de = b.de || null;
    }
    if (reviewBannerJson) {
      const b = JSON.parse(reviewBannerJson);
      if (b.pl !== undefined) updates.review_banner_text = b.pl || null;
      if (b.en !== undefined) updates.review_banner_text_en = b.en || null;
      if (b.de !== undefined) updates.review_banner_text_de = b.de || null;
    }
  } catch (e) {
    // Ignore parse errors for banners
  }

  await upsertLocationLinks(locationId, links);
  await updateLocation(locationId, updates);
  revalidatePath(`/portal/${subscriptionId}`, "layout");
  return { ok: true };
}

export async function updateSupportEmail(formData: FormData): Promise<ActionResult> {
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

  if (!subscriptionId || !locationId || !supportEmail) return { ok: false, error: "failed" };

  const ok = await verifyOwnership(customer.customer_id, subscriptionId, locationId);
  if (!ok) return { ok: false, error: "failed" };

  await updateLocation(locationId, {
    support_email: supportEmail,
    owner_email: supportEmail,
  });
  revalidatePath(`/portal/${subscriptionId}`, "layout");
  return { ok: true };
}

export async function updateActiveLanguages(formData: FormData): Promise<ActionResult> {
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

  if (!subscriptionId || !locationId) return { ok: false, error: "failed" };

  const ok = await verifyOwnership(customer.customer_id, subscriptionId, locationId);
  if (!ok) return { ok: false, error: "failed" };

  const selected = SUPPORTED_LANGUAGES.filter((l) => formData.get(`lang_${l}`) === "on");
  if (selected.length === 0) {
    // Minimum jeden aktywny język musi zostać — odrzucamy zmianę.
    return { ok: false, error: "min_one" };
  }

  await updateLocation(locationId, { active_languages: selected });
  revalidatePath(`/portal/${subscriptionId}`, "layout");
  return { ok: true };
}
