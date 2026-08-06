"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { updateLocation } from "@/lib/db/locations";
import type { ActionResult } from "../../action-result";
import { uploadLogo } from "@/lib/storage";

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

export async function updateMenuSettingsAction(formData: FormData): Promise<ActionResult> {
  const cookieStore = await cookies();
  const supabase = makeSupabase(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const customer = await getCustomerByEmail(user.email);
  if (!customer) redirect("/portal/login");

  const locationId = Number(formData.get("location_id"));
  if (!locationId) return { ok: false, error: "failed" };

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const sub = subscriptions.find((s) => s.location?.location_id === locationId);
  if (!sub) return { ok: false, error: "failed" };

  const has_menu_enabled = formData.get("has_menu_enabled") === "on";
  const menu_type = formData.get("menu_type") as "link" | "image";
  const menu_link = formData.get("menu_link") as string;
  const menuImageFile = formData.get("menu_image_file") as File | null;
  let menu_image_url = formData.get("menu_image_url") as string;

  if (menuImageFile && menuImageFile.size > 0) {
    try {
      const { publicUrl } = await uploadLogo(menuImageFile);
      menu_image_url = publicUrl;
    } catch (e) {
      return { ok: false, error: "failed to upload image" };
    }
  }

  await updateLocation(locationId, {
    has_menu_enabled,
    menu_type: menu_type === "image" ? "image" : "link",
    menu_link: menu_link || null,
    menu_image_url: menu_image_url || null,
  });

  revalidatePath(`/portal/${sub.subscription_id}`, "layout");
  revalidatePath(`/l/[slug]`, "page");
  return { ok: true };
}
