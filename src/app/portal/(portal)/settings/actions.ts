"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { updateLocation, setLinktreeSlug } from "@/lib/db/locations";
import type { ActionResult } from "../action-result";

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

export async function updatePortalPassword(formData: FormData): Promise<ActionResult> {
  const cookieStore = await cookies();
  const supabase = makeSupabase(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const subscriptionId = Number(formData.get("subscription_id"));
  const password = formData.get("password") as string;
  const passwordConfirm = formData.get("password_confirm") as string;

  if (!subscriptionId) return { ok: false, error: "failed" };

  if (!password || password !== passwordConfirm) {
    return { ok: false, error: "mismatch" };
  }

  if (password.length < 8) {
    return { ok: false, error: "short" };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, error: "failed" };
  }

  return { ok: true };
}

export async function updateScanRedirectMode(formData: FormData): Promise<ActionResult> {
  const cookieStore = await cookies();
  const supabase = makeSupabase(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const customer = await getCustomerByEmail(user.email);
  if (!customer) redirect("/portal/login");

  const locationId = Number(formData.get("location_id"));
  const mode = formData.get("scan_redirect_mode") as string;

  if (!locationId || !["review", "linktree"].includes(mode)) {
    return { ok: false, error: "failed" };
  }

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const matchingSub = subscriptions.find(
    (s) => s.location?.location_id === locationId
  );
  if (!matchingSub) return { ok: false, error: "failed" };

  await updateLocation(locationId, {
    scan_redirect_mode: mode as "review" | "linktree",
  });
  revalidatePath(`/portal/${matchingSub.subscription_id}`, "layout");
  return { ok: true };
}

export async function updateFourStarRedirect(formData: FormData): Promise<ActionResult> {
  const cookieStore = await cookies();
  const supabase = makeSupabase(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const customer = await getCustomerByEmail(user.email);
  if (!customer) redirect("/portal/login");

  const locationId = Number(formData.get("location_id"));
  const redirectFourStar = formData.get("redirect_four_star_reviews") === "on";

  if (!locationId) return { ok: false, error: "failed" };

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const matchingSub = subscriptions.find(
    (s) => s.location?.location_id === locationId
  );
  if (!matchingSub) return { ok: false, error: "failed" };

  await updateLocation(locationId, {
    redirect_four_star_reviews: redirectFourStar,
  });
  revalidatePath(`/portal/${matchingSub.subscription_id}`, "layout");
  return { ok: true };
}

export async function updateLinktreeSlug(formData: FormData): Promise<ActionResult> {
  const cookieStore = await cookies();
  const supabase = makeSupabase(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const customer = await getCustomerByEmail(user.email);
  if (!customer) redirect("/portal/login");

  const locationId = Number(formData.get("location_id"));
  const subscriptionId = Number(formData.get("subscription_id"));
  const slug = ((formData.get("linktree_slug") as string) ?? "").trim().toLowerCase();

  if (!locationId || !subscriptionId) return { ok: false, error: "invalid" };

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const matchingSub = subscriptions.find(
    (s) => s.location?.location_id === locationId
  );
  if (!matchingSub) return { ok: false, error: "invalid" };

  if (!/^[a-z0-9-]{3,40}$/.test(slug) || slug.startsWith("-") || slug.endsWith("-")) {
    return { ok: false, error: "invalid" };
  }

  const result = await setLinktreeSlug(locationId, slug);
  if (!result.ok) {
    return { ok: false, error: "taken" };
  }

  revalidatePath(`/portal/${subscriptionId}`, "layout");
  return { ok: true };
}

export async function updateGoogleLocation(formData: FormData): Promise<ActionResult> {
  const cookieStore = await cookies();
  const supabase = makeSupabase(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/portal/login");

  const customer = await getCustomerByEmail(user.email);
  if (!customer) redirect("/portal/login");

  const locationId = Number(formData.get("location_id"));
  const googleBusinessName = formData.get("google_business_name") as string;
  const googleBusinessAddress = formData.get("google_business_address") as string;
  const googleReviewLink = formData.get("google_review_link") as string;
  const googlePlacesId = formData.get("google_places_id") as string;

  if (!locationId || !googlePlacesId || !googleReviewLink) {
    return { ok: false, error: "failed" };
  }

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const matchingSub = subscriptions.find(
    (s) => s.location?.location_id === locationId
  );
  if (!matchingSub) return { ok: false, error: "failed" };

  await updateLocation(locationId, {
    google_business_name: googleBusinessName,
    google_business_address: googleBusinessAddress,
    google_review_link: googleReviewLink,
    google_places_id: googlePlacesId,
  });
  revalidatePath(`/portal/${matchingSub.subscription_id}`, "layout");
  return { ok: true };
}
