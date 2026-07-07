import { createAdminClient } from "../supabase/admin";
import type { CustomerLocation, CustomerLocationLink } from "../types";

export async function getLocationBySubscriptionId(
  subscriptionId: number
): Promise<CustomerLocation | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customer_locations")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .single();
  return data ?? null;
}

export async function getLocationBySlug(slug: string): Promise<CustomerLocation | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customer_locations")
    .select("*")
    .eq("linktree_slug", slug)
    .eq("has_linktree_access", true)
    .single();
  return data ?? null;
}

export async function createLocation(data: {
  subscription_id: number;
  location_name: string;
  google_business_name?: string;
  google_business_address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  google_review_link?: string;
  google_places_id?: string;
  support_email?: string;
  logo_path?: string;
  logo_link?: string;
  owner_email?: string;
}): Promise<CustomerLocation> {
  const supabase = createAdminClient();
  const { data: location, error } = await supabase
    .from("customer_locations")
    .insert({
      ...data,
      has_linktree_access: true,
      has_promo_enabled: true,
      has_loyalty_enabled: true,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create location: ${error.message}`);
  return location;
}

export async function getLocationLinksByLocationId(
  locationId: number
): Promise<CustomerLocationLink[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customer_location_links")
    .select("*")
    .eq("customer_location_id", locationId)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export interface LocationWithCustomer extends CustomerLocation {
  customer_name: string;
  subscription_status: string;
  total_plate_visits: number;
  avg_rating: number | null;
}

export async function listLocations(search?: string): Promise<LocationWithCustomer[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("customer_locations")
    .select("*, subscriptions(status, customers(customer_name), plates(number_of_visits, reviews(rating)))")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `location_name.ilike.%${search}%,google_business_name.ilike.%${search}%,city.ilike.%${search}%,linktree_slug.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list locations: ${error.message}`);
  return (data ?? []).map((row: any) => {
    const plates: any[] = row.subscriptions?.plates ?? [];
    const ratings = plates
      .flatMap((p: any) => p.reviews ?? [])
      .map((r: any) => r.rating)
      .filter((r: any) => r !== null && r !== undefined) as number[];
    return {
      ...row,
      customer_name: row.subscriptions?.customers?.customer_name ?? "",
      subscription_status: row.subscriptions?.status ?? "",
      total_plate_visits: plates.reduce(
        (sum: number, p: any) => sum + (p.number_of_visits ?? 0),
        0
      ),
      avg_rating: ratings.length > 0
        ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 100) / 100
        : null,
    };
  });
}

export async function incrementLinktreeVisits(locationId: number): Promise<void> {
  const supabase = createAdminClient();
  await supabase.rpc("increment_linktree_visits", { p_location_id: locationId });
}

export async function getLocationById(locationId: number): Promise<CustomerLocation | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customer_locations")
    .select("*")
    .eq("location_id", locationId)
    .single();
  return data ?? null;
}

export async function updateLocation(
  locationId: number,
  updates: {
    location_name?: string;
    google_business_name?: string | null;
    google_business_address?: string | null;
    linktree_slug?: string | null;
    has_linktree_access?: boolean;
    has_promo_enabled?: boolean;
    has_loyalty_enabled?: boolean;
    promo_description?: string | null;
    promo_banner_text?: string | null;
    promo_sms_text?: string | null;
    google_review_link?: string | null;
    google_places_id?: string | null;
    support_email?: string | null;
    logo_path?: string | null;
    logo_link?: string | null;
    owner_email?: string | null;
    scan_redirect_mode?: "review" | "linktree";
  }
): Promise<CustomerLocation> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customer_locations")
    .update(updates)
    .eq("location_id", locationId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update location: ${error.message}`);
  return data;
}

export async function upsertLocationLinks(
  locationId: number,
  links: { title: string; title_pl?: string | null; title_en?: string | null; title_de?: string | null; url: string; sort_order: number }[]
): Promise<void> {
  const supabase = createAdminClient();

  const { error: delError } = await supabase
    .from("customer_location_links")
    .delete()
    .eq("customer_location_id", locationId);
  if (delError) throw new Error(`Failed to delete links: ${delError.message}`);

  if (links.length > 0) {
    const { error: insError } = await supabase
      .from("customer_location_links")
      .insert(links.map((l) => ({ customer_location_id: locationId, ...l })));
    if (insError) throw new Error(`Failed to insert links: ${insError.message}`);
  }
}
