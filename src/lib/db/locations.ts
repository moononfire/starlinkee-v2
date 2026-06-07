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

export async function incrementLinktreeVisits(locationId: number): Promise<void> {
  const supabase = createAdminClient();
  await supabase.rpc("increment_linktree_visits", { p_location_id: locationId });
}
