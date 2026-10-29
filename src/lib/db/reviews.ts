import { createAdminClient } from "../supabase/admin";
import { ilikeValue } from "./search";
import type { Review } from "../types";

export interface ReviewWithLocation extends Review {
  plate_number: string;
  location_id: number | null;
  location_name: string | null;
}

export async function listReviews(search?: string): Promise<ReviewWithLocation[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("reviews")
    .select("*, plates(plate_number, subscriptions(customer_locations(location_id, location_name)))")
    .order("created_at", { ascending: false })
    .limit(500);

  if (search) {
    const pattern = ilikeValue(search);
    query = query.or(
      `feedback_message.ilike.${pattern},contact_email.ilike.${pattern},contact_phone.ilike.${pattern}`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list reviews: ${error.message}`);
  return (data ?? []).map((row: any) => {
    const customerLocations = row.plates?.subscriptions?.customer_locations;
    const location = Array.isArray(customerLocations) ? customerLocations[0] : customerLocations;
    return {
      ...row,
      plate_number: row.plates?.plate_number ?? "?",
      location_id: location?.location_id ?? null,
      location_name: location?.location_name ?? null,
    };
  });
}

interface ScanDeviceInfo {
  ip_address?: string | null;
  user_agent?: string | null;
  device_id?: string | null;
}

export async function createScanRecord(plateId: number, deviceInfo?: ScanDeviceInfo): Promise<string> {
  const supabase = createAdminClient();
  const scanId = crypto.randomUUID();
  // The review belongs to the subscription the plate is on right now. A plate later moved to another
  // subscription or customer must not take its guests' feedback along (F12).
  const { data: plate } = await supabase.from("plates").select("subscription_id").eq("plate_id", plateId).single();
  const { error } = await supabase.from("reviews").insert({
    plate_id: plateId,
    subscription_id: plate?.subscription_id ?? null,
    scan_id: scanId,
    ...deviceInfo,
  });
  if (error) throw new Error(`Failed to create scan record: ${error.message}`);
  return scanId;
}

const SCAN_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

export async function findScanIdByDevice(plateId: number, deviceId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const since = new Date(Date.now() - SCAN_DEDUPE_WINDOW_MS).toISOString();
  const { data } = await supabase
    .from("reviews")
    .select("scan_id")
    .eq("plate_id", plateId)
    .eq("device_id", deviceId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.scan_id ?? null;
}

export async function getReviewByScanId(scanId: string): Promise<Review | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("scan_id", scanId)
    .single();
  return data ?? null;
}

export async function updateRating(scanId: string, rating: number): Promise<void> {
  const supabase = createAdminClient();

  // Guard: only update if rating is not already set
  const { data: existing } = await supabase
    .from("reviews")
    .select("rating, plates(plate_number)")
    .eq("scan_id", scanId)
    .single();

  if (!existing) throw new Error("Scan not found");
  
  const plateNumber = (existing.plates as any)?.plate_number;
  if (existing.rating !== null && plateNumber !== "TJRUAO") {
    const error = new Error("Rating already submitted") as Error & { existingRating: number };
    error.existingRating = existing.rating;
    throw error;
  }

  // Conditional write: two concurrent submits both pass the check above, only the first may win.
  let update = supabase
    .from("reviews")
    .update({ rating, rating_time: new Date().toISOString() })
    .eq("scan_id", scanId);
  if (plateNumber !== "TJRUAO") update = update.is("rating", null);
  const { data: updated, error } = await update.select("review_id");

  if (error) throw new Error(`Failed to update rating: ${error.message}`);
  if (!updated || updated.length === 0) {
    const { data: current } = await supabase.from("reviews").select("rating").eq("scan_id", scanId).single();
    const lost = new Error("Rating already submitted") as Error & { existingRating: number };
    lost.existingRating = current?.rating ?? rating;
    throw lost;
  }
}

export async function getRedirectFourStarReviews(scanId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reviews")
    .select("plates(subscriptions(customer_locations(redirect_four_star_reviews)))")
    .eq("scan_id", scanId)
    .single();
  const row = data as any;
  const customerLocations = row?.plates?.subscriptions?.customer_locations;
  const location = Array.isArray(customerLocations) ? customerLocations[0] : customerLocations;
  return location?.redirect_four_star_reviews ?? true;
}

export async function updateFeedback(
  scanId: string,
  data: {
    feedback_message: string;
    user_name?: string;
    contact_email?: string;
    contact_phone?: string;
  }
): Promise<boolean> {
  const supabase = createAdminClient();
  // Feedback is accepted once per scan; follow-ups go through the message thread.
  const { data: updated, error } = await supabase
    .from("reviews")
    .update({ ...data, feedback_time: new Date().toISOString() })
    .eq("scan_id", scanId)
    .is("feedback_time", null)
    .select("review_id");
  if (error) throw new Error(`Failed to update feedback: ${error.message}`);
  return (updated?.length ?? 0) > 0;
}
