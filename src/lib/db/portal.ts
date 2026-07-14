import { createAdminClient } from "../supabase/admin";
import type { Customer, Subscription, CustomerLocation, Plate, Review } from "../types";

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("email", email)
    .single();
  return data ?? null;
}

export interface PortalSubscription extends Subscription {
  location: CustomerLocation | null;
  plates: Plate[];
}

export async function getCustomerSubscriptions(
  customerId: number
): Promise<PortalSubscription[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, customer_locations(*), plates(*)")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load subscriptions: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    ...row,
    location: row.customer_locations?.[0] ?? row.customer_locations ?? null,
    plates: row.plates ?? [],
  }));
}

export async function getReviewsBySubscription(
  subscriptionId: number,
  limit = 10
): Promise<(Review & { plate_number: string })[]> {
  const supabase = createAdminClient();

  const { data: plates } = await supabase
    .from("plates")
    .select("plate_id, plate_number")
    .eq("subscription_id", subscriptionId);

  if (!plates || plates.length === 0) return [];

  const plateIds = plates.map((p: any) => p.plate_id);
  const plateMap = new Map(plates.map((p: any) => [p.plate_id, p.plate_number]));

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("*")
    .in("plate_id", plateIds)
    .not("rating", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);

  return (reviews ?? []).map((r: any) => ({
    ...r,
    plate_number: plateMap.get(r.plate_id) ?? "?",
  }));
}

export async function getScanCountsBySubscription(
  subscriptionId: number
): Promise<{ total: number; byPlate: Record<number, number> }> {
  const supabase = createAdminClient();

  const { data: plates } = await supabase
    .from("plates")
    .select("plate_id")
    .eq("subscription_id", subscriptionId);

  if (!plates || plates.length === 0) return { total: 0, byPlate: {} };

  const plateIds = plates.map((p: any) => p.plate_id);
  const byPlate: Record<number, number> = Object.fromEntries(plateIds.map((id) => [id, 0]));

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("plate_id")
    .in("plate_id", plateIds);

  if (error) throw new Error(`Failed to count scans: ${error.message}`);

  for (const r of reviews ?? []) {
    byPlate[r.plate_id] = (byPlate[r.plate_id] ?? 0) + 1;
  }

  return { total: reviews?.length ?? 0, byPlate };
}

export async function getAllReviewsBySubscription(
  subscriptionId: number
): Promise<(Review & { plate_number: string })[]> {
  const supabase = createAdminClient();

  const { data: plates } = await supabase
    .from("plates")
    .select("plate_id, plate_number")
    .eq("subscription_id", subscriptionId);

  if (!plates || plates.length === 0) return [];

  const plateIds = plates.map((p: any) => p.plate_id);
  const plateMap = new Map(plates.map((p: any) => [p.plate_id, p.plate_number]));

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("*")
    .in("plate_id", plateIds)
    .not("rating", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);

  return (reviews ?? []).map((r: any) => ({
    ...r,
    plate_number: plateMap.get(r.plate_id) ?? "?",
  }));
}

export async function getCustomerReviews(
  customerId: number,
  limit = 20
): Promise<(Review & { plate_number: string })[]> {
  const supabase = createAdminClient();

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("subscription_id")
    .eq("customer_id", customerId);

  if (!subs || subs.length === 0) return [];

  const subIds = subs.map((s) => s.subscription_id);

  const { data: plates } = await supabase
    .from("plates")
    .select("plate_id, plate_number")
    .in("subscription_id", subIds);

  if (!plates || plates.length === 0) return [];

  const plateIds = plates.map((p) => p.plate_id);
  const plateMap = new Map(plates.map((p) => [p.plate_id, p.plate_number]));

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("*")
    .in("plate_id", plateIds)
    .not("rating", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);

  return (reviews ?? []).map((r: any) => ({
    ...r,
    plate_number: plateMap.get(r.plate_id) ?? "?",
  }));
}
