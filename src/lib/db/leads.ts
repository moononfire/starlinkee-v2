import { createAdminClient } from "../supabase/admin";
import type { LocationLead } from "../types";

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
  claimToken: string
): Promise<LocationLead> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("location_leads")
    .insert({ location_id: locationId, phone, email, agreed_to_terms: agreedToTerms, claim_token: claimToken, is_used: false })
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

export async function markLeadAsUsed(leadId: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("location_leads")
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq("id", leadId);
  if (error) throw new Error(`Failed to mark lead as used: ${error.message}`);
}
