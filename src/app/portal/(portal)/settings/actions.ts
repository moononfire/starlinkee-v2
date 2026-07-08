"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { getCustomerByEmail, getCustomerSubscriptions } from "@/lib/db/portal";
import { updateLocation, setLinktreeSlug } from "@/lib/db/locations";

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

export async function updateScanRedirectMode(formData: FormData) {
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
    redirect("/portal/settings");
  }

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const matchingSub = subscriptions.find(
    (s) => s.location?.location_id === locationId
  );
  if (!matchingSub) redirect("/portal/settings");

  await updateLocation(locationId, {
    scan_redirect_mode: mode as "review" | "linktree",
  });
  redirect(`/portal/${matchingSub.subscription_id}/settings?saved=scan_mode`);
}

export async function updateFourStarRedirect(formData: FormData) {
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

  if (!locationId) {
    redirect("/portal/settings");
  }

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const matchingSub = subscriptions.find(
    (s) => s.location?.location_id === locationId
  );
  if (!matchingSub) redirect("/portal/settings");

  await updateLocation(locationId, {
    redirect_four_star_reviews: redirectFourStar,
  });
  redirect(`/portal/${matchingSub.subscription_id}/settings?saved=four_star`);
}

export async function updateLinktreeSlug(formData: FormData) {
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

  if (!locationId || !subscriptionId) {
    redirect("/portal/settings");
  }

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const matchingSub = subscriptions.find(
    (s) => s.location?.location_id === locationId
  );
  if (!matchingSub) redirect("/portal/settings");

  if (!/^[a-z0-9-]{3,40}$/.test(slug) || slug.startsWith("-") || slug.endsWith("-")) {
    redirect(`/portal/${subscriptionId}/settings?linktreeError=invalid`);
  }

  const result = await setLinktreeSlug(locationId, slug);
  if (!result.ok) {
    redirect(`/portal/${subscriptionId}/settings?linktreeError=taken`);
  }

  redirect(`/portal/${subscriptionId}/settings?saved=linktree_slug`);
}

export async function updateGoogleLocation(formData: FormData) {
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
    redirect("/portal/settings");
  }

  const subscriptions = await getCustomerSubscriptions(customer.customer_id);
  const matchingSub = subscriptions.find(
    (s) => s.location?.location_id === locationId
  );
  if (!matchingSub) redirect("/portal/settings");

  await updateLocation(locationId, {
    google_business_name: googleBusinessName,
    google_business_address: googleBusinessAddress,
    google_review_link: googleReviewLink,
    google_places_id: googlePlacesId,
  });
  redirect(`/portal/${matchingSub.subscription_id}/settings?saved=google_location`);
}
