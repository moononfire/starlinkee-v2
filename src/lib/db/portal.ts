import { createAdminClient } from "../supabase/admin";
import { plateScanCount } from "../plate-scans";
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

export interface PlateCounts {
  total: number;
  byPlate: Record<number, number>;
}

// scans = every physical scan since the 2026-07-01 reset (plates.number_of_visits, bumped on
// each scan) plus scan_count_offset; pre-tracking history is only a lower bound (the offset
// covers the gap to the old reviews count). Counters are per plate over its whole life, not
// per subscription or per time window.
// reviewVisits = reviews rows, created on the way to the review page (deduped per device).
export async function getPlateStatsBySubscription(
  subscriptionId: number
): Promise<{ scans: PlateCounts; reviewVisits: PlateCounts }> {
  const supabase = createAdminClient();

  const { data: plates, error: platesError } = await supabase
    .from("plates")
    .select("plate_id, number_of_visits, scan_count_offset")
    .eq("subscription_id", subscriptionId);
  if (platesError) throw new Error(`Failed to count scans: ${platesError.message}`);

  if (!plates || plates.length === 0) {
    return { scans: { total: 0, byPlate: {} }, reviewVisits: { total: 0, byPlate: {} } };
  }

  const scansByPlate: Record<number, number> = {};
  const visitsByPlate: Record<number, number> = {};
  for (const p of plates) {
    scansByPlate[p.plate_id] = plateScanCount(p);
    visitsByPlate[p.plate_id] = 0;
  }

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("plate_id")
    .in("plate_id", plates.map((p) => p.plate_id));
  if (error) throw new Error(`Failed to count scans: ${error.message}`);

  for (const r of reviews ?? []) {
    visitsByPlate[r.plate_id] = (visitsByPlate[r.plate_id] ?? 0) + 1;
  }

  const sum = (m: Record<number, number>) => Object.values(m).reduce((a, b) => a + b, 0);
  return {
    scans: { total: sum(scansByPlate), byPlate: scansByPlate },
    reviewVisits: { total: reviews?.length ?? 0, byPlate: visitsByPlate },
  };
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
