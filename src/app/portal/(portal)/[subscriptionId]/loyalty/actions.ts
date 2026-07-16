"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { updateLocation } from "@/lib/db/locations";
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

export async function updateLoyaltyEnabled(formData: FormData): Promise<ActionResult> {
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
  const enabled = formData.get("has_loyalty_enabled") === "on";

  if (!subscriptionId || !locationId) return { ok: false, error: "failed" };

  const ok = await verifyOwnership(customer.customer_id, subscriptionId, locationId);
  if (!ok) return { ok: false, error: "failed" };

  await updateLocation(locationId, { has_loyalty_enabled: enabled });

  revalidatePath(`/portal/${subscriptionId}`, "layout");
  return { ok: true };
}

export async function updateLoyaltySettings(formData: FormData): Promise<ActionResult> {
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
  const cardText = (formData.get("loyalty_card_text") as string)?.trim() || null;
  const cardTextEn = (formData.get("loyalty_card_text_en") as string)?.trim() || null;
  const cardTextDe = (formData.get("loyalty_card_text_de") as string)?.trim() || null;
  const rewardText = (formData.get("loyalty_reward_text") as string)?.trim() || null;
  const rewardTextEn = (formData.get("loyalty_reward_text_en") as string)?.trim() || null;
  const rewardTextDe = (formData.get("loyalty_reward_text_de") as string)?.trim() || null;
  const rawStamps = Number(formData.get("loyalty_stamps_required"));
  const stampsRequired = Math.min(10, Math.max(5, Number.isFinite(rawStamps) ? rawStamps : 10));

  if (!subscriptionId || !locationId) return { ok: false, error: "failed" };

  const ok = await verifyOwnership(customer.customer_id, subscriptionId, locationId);
  if (!ok) return { ok: false, error: "failed" };

  await updateLocation(locationId, {
    loyalty_card_text: cardText,
    loyalty_card_text_en: cardTextEn,
    loyalty_card_text_de: cardTextDe,
    loyalty_reward_text: rewardText,
    loyalty_reward_text_en: rewardTextEn,
    loyalty_reward_text_de: rewardTextDe,
    loyalty_stamps_required: stampsRequired,
  });

  revalidatePath(`/portal/${subscriptionId}`, "layout");
  return { ok: true };
}
