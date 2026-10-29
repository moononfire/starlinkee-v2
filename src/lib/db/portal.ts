import { createAdminClient } from "../supabase/admin";
import { plateScanCount } from "../plate-scans";
import { normalizeEmail, escapeLikePattern, pickByEmail } from "../customer-email";
import type { Customer, Subscription, CustomerLocation, Plate, Review } from "../types";

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  const supabase = createAdminClient();
  // ilike: rows saved before e-mails were normalized may still have capitals. Oldest row wins if duplicates exist.
  const { data } = await supabase
    .from("customers")
    .select("*")
    .ilike("email", escapeLikePattern(normalizeEmail(email)))
    .order("customer_id", { ascending: true });
  return pickByEmail(data as Customer[] | null, email);
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

  // An "active" subscription past its end date is already off for guests; show it as inactive
  // (so it can be renewed) without waiting for the nightly cron, like getSubscriptionById does.
  const now = new Date();
  return (data ?? []).map((row: any) => ({
    ...row,
    status:
      row.status === "active" && row.expiration_datetime && new Date(row.expiration_datetime) < now
        ? "inactive"
        : row.status,
    location: row.customer_locations?.[0] ?? row.customer_locations ?? null,
    plates: row.plates ?? [],
  }));
}

/** Reviews of a subscription: those created while the plate was on it, wherever the plate is today. */
async function loadReviewsOfSubscription(
  subscriptionId: number,
  limit?: number
): Promise<(Review & { plate_number: string })[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("reviews")
    .select("*, plates(plate_number)")
    .eq("subscription_id", subscriptionId)
    .not("rating", "is", null)
    .order("created_at", { ascending: false });
  if (limit !== undefined) query = query.limit(limit);

  const { data: reviews, error } = await query;
  if (error) throw new Error(`Failed to load reviews: ${error.message}`);

  return (reviews ?? []).map(({ plates, ...r }: any) => ({
    ...r,
    plate_number: plates?.plate_number ?? "?",
  }));
}

export async function getReviewsBySubscription(
  subscriptionId: number,
  limit = 10
): Promise<(Review & { plate_number: string })[]> {
  return loadReviewsOfSubscription(subscriptionId, limit);
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

  const scansByPlate: Record<number, number> = {};
  const visitsByPlate: Record<number, number> = {};
  for (const p of plates ?? []) {
    scansByPlate[p.plate_id] = plateScanCount(p);
    visitsByPlate[p.plate_id] = 0;
  }

  // Review visits belong to the subscription they were created under, even for a plate that has since moved.
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("plate_id")
    .eq("subscription_id", subscriptionId);
  if (error) throw new Error(`Failed to count scans: ${error.message}`);

  for (const r of reviews ?? []) {
    if (r.plate_id in visitsByPlate) visitsByPlate[r.plate_id] += 1;
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
  return loadReviewsOfSubscription(subscriptionId);
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

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("*, plates(plate_number)")
    .in("subscription_id", subs.map((s) => s.subscription_id))
    .not("rating", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to load reviews: ${error.message}`);

  return (reviews ?? []).map(({ plates, ...r }: any) => ({
    ...r,
    plate_number: plates?.plate_number ?? "?",
  }));
}
