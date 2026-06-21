"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { updateLocation } from "@/lib/db/locations";

export async function updateScanRedirectMode(formData: FormData) {
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
  if (!user?.email) redirect("/portal/login");

  const customer = await getCustomerByEmail(user.email);
  if (!customer) redirect("/portal/login");

  const locationId = Number(formData.get("location_id"));
  const mode = formData.get("scan_redirect_mode") as string;

  if (!locationId || !["review", "linktree"].includes(mode)) {
    redirect("/portal/settings");
  }

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const ownsLocation = subscriptions.some(
    (s) => s.location?.location_id === locationId
  );
  if (!ownsLocation) redirect("/portal/settings");

  await updateLocation(locationId, { scan_redirect_mode: mode as "review" | "linktree" });
  redirect("/portal/settings");
}
