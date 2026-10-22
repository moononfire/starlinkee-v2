"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { updateLocation } from "@/lib/db/locations";

export async function updateWifiSettingsAction(
  formData: FormData
) {
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

  if (!user?.email) {
    return { ok: false, error: "Unauthorized" };
  }

  const locationId = Number(formData.get("location_id"));
  const hasWifiEnabled = formData.get("has_wifi_enabled") === "on";
  const wifiSsid = formData.get("wifi_ssid") as string;
  const wifiPassword = formData.get("wifi_password") as string;

  if (!locationId) return { ok: false, error: "Invalid location ID" };

  const customer = await getCustomerByEmail(user.email);
  if (!customer) return { ok: false, error: "Unauthorized" };

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  if (!subscriptions.some((s) => s.location?.location_id === locationId)) {
    return { ok: false, error: "generic" };
  }

  try {
    await updateLocation(locationId, {
      has_wifi_enabled: hasWifiEnabled,
      wifi_ssid: wifiSsid || null,
      wifi_password: wifiPassword || null,
    });
  } catch {
    return { ok: false, error: "generic" };
  }

  revalidatePath("/portal", "layout");
  revalidatePath("/l/[slug]", "page");

  return { ok: true };
}
