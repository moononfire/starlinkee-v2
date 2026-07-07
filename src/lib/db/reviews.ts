import { createAdminClient } from "../supabase/admin";
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
    query = query.or(
      `feedback_message.ilike.%${search}%,contact_email.ilike.%${search}%,contact_phone.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list reviews: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    ...row,
    plate_number: row.plates?.plate_number ?? "?",
    location_id: row.plates?.subscriptions?.customer_locations?.location_id ?? null,
    location_name: row.plates?.subscriptions?.customer_locations?.location_name ?? null,
  }));
}

interface ScanDeviceInfo {
  ip_address?: string | null;
  user_agent?: string | null;
  device_id?: string | null;
}

export async function createScanRecord(plateId: number, deviceInfo?: ScanDeviceInfo): Promise<string> {
  const supabase = createAdminClient();
  const scanId = crypto.randomUUID();
  const { error } = await supabase.from("reviews").insert({
    plate_id: plateId,
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
    .select("rating")
    .eq("scan_id", scanId)
    .single();

  if (!existing) throw new Error("Scan not found");
  if (existing.rating !== null) {
    const error = new Error("Rating already submitted") as Error & { existingRating: number };
    error.existingRating = existing.rating;
    throw error;
  }

  const { error } = await supabase
    .from("reviews")
    .update({ rating, rating_time: new Date().toISOString() })
    .eq("scan_id", scanId);

  if (error) throw new Error(`Failed to update rating: ${error.message}`);
}

export async function updateFeedback(
  scanId: string,
  data: {
    feedback_message: string;
    user_name?: string;
    contact_email?: string;
    contact_phone?: string;
  }
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reviews")
    .update({ ...data, feedback_time: new Date().toISOString() })
    .eq("scan_id", scanId);
  if (error) throw new Error(`Failed to update feedback: ${error.message}`);
}
