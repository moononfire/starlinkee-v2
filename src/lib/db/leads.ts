import { createAdminClient } from "../supabase/admin";
import type { LocationLead } from "../types";

const COUPON_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCouponCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes)
    .map((b) => COUPON_CHARS[b % COUPON_CHARS.length])
    .join("");
}

export async function checkLeadExists(locationId: number, phone: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("location_leads")
    .select("id")
    .eq("location_id", locationId)
    .eq("phone", phone)
    .single();
  return !!data;
}

export async function createLead(
  locationId: number,
  phone: string,
  email: string | null,
  agreedToTerms: boolean,
  claimToken: string,
  couponCode: string
): Promise<LocationLead> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("location_leads")
    .insert({
      location_id: locationId,
      phone,
      email,
      agreed_to_terms: agreedToTerms,
      claim_token: claimToken,
      coupon_code: couponCode,
      is_used: false,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create lead: ${error.message}`);
  return data;
}

export async function getLeadByToken(token: string): Promise<LocationLead | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("location_leads")
    .select("*")
    .eq("claim_token", token)
    .single();
  return data ?? null;
}

export async function getLeadByCouponCode(code: string): Promise<LocationLead | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("location_leads")
    .select("*")
    .eq("coupon_code", code)
    .single();
  return data ?? null;
}

export async function getLeadsByLocationId(locationId: number): Promise<LocationLead[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("location_leads")
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load leads: ${error.message}`);
  return data ?? [];
}

export const CLAIM_WINDOW_MS = 15 * 60 * 1000;

export async function claimLead(token: string): Promise<{ claimedAt: string; isUsed: boolean } | null> {
  const supabase = createAdminClient();
  const { data: lead } = await supabase
    .from("location_leads")
    .select("id, is_used, claimed_at")
    .eq("claim_token", token)
    .single();
  if (!lead) return null;
  if (lead.is_used) return { claimedAt: lead.claimed_at ?? new Date().toISOString(), isUsed: true };

  const stillActive = lead.claimed_at && Date.now() - new Date(lead.claimed_at).getTime() < CLAIM_WINDOW_MS;
  if (stillActive) return { claimedAt: lead.claimed_at, isUsed: false };

  const claimedAt = new Date().toISOString();
  const { error } = await supabase
    .from("location_leads")
    .update({ claimed_at: claimedAt })
    .eq("id", lead.id);
  if (error) throw new Error(`Failed to claim lead: ${error.message}`);
  return { claimedAt, isUsed: false };
}

export async function markLeadAsUsed(leadId: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("location_leads")
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) throw new Error(`Failed to mark lead as used: ${error.message}`);
}
