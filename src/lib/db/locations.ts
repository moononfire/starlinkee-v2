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
    .insert(data)
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

export async function listLocations(): Promise<LocationWithCustomer[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("customer_locations")
    .select("*, subscriptions(status, customers(customer_name), plates(number_of_visits, reviews(rating)))")
    .order("created_at", { ascending: false });
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
