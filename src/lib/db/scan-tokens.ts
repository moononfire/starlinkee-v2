import { createAdminClient } from "../supabase/admin";

export async function createScanToken(locationId: number): Promise<string> {
  const supabase = createAdminClient();
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("scan_tokens")
    .insert({ location_id: locationId, token, expires_at: expiresAt });

  if (error) throw new Error(`Failed to create scan token: ${error.message}`);
  return token;
}

export async function validateScanToken(
  token: string
): Promise<{ valid: boolean; locationId?: number }> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("scan_tokens")
    .select("location_id, expires_at")
    .eq("token", token)
    .single();

  if (!data) return { valid: false };
  if (new Date(data.expires_at) < new Date()) return { valid: false };

  return { valid: true, locationId: data.location_id };
}
