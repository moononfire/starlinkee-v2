import { createAdminClient } from "./supabase/admin";
import { getLocationBySlug } from "./db/locations";
import { getLoyaltyCard } from "./db/loyalty";

export type VerifyGoogleSessionResult =
  | { ok: true; customerUserId: string; email: string; locationId: number; stamps: number; rewardReady: boolean }
  | { ok: false; status: number; error: string };

// Google/Supabase already verified the user's identity when they signed in —
// this just checks that the access token they handed us is genuine and
// resolves the loyalty card for the location they're standing in.
export async function verifyGoogleSession(
  supabaseAccessToken: unknown,
  slug: unknown
): Promise<VerifyGoogleSessionResult> {
  if (!supabaseAccessToken || !slug) {
    return { ok: false, status: 400, error: "Missing fields" };
  }

  const location = await getLocationBySlug(String(slug));
  if (!location || !location.has_loyalty_enabled) {
    return { ok: false, status: 404, error: "Location not found" };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.getUser(String(supabaseAccessToken));
  if (error || !data.user || !data.user.email) {
    return { ok: false, status: 401, error: "Invalid session" };
  }

  const maxStamps = location.loyalty_stamps_required ?? 10;
  const card = await getLoyaltyCard(location.location_id, data.user.id);
  const stamps = card?.stamps_count ?? 0;

  return {
    ok: true,
    customerUserId: data.user.id,
    email: data.user.email,
    locationId: location.location_id,
    stamps,
    rewardReady: stamps >= maxStamps,
  };
}
