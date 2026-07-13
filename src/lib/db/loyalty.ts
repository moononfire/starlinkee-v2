import { createAdminClient } from "../supabase/admin";
import type { LoyaltyCard, LoyaltyOtp } from "../types";

export async function getLoyaltyCard(locationId: number, phone: string): Promise<LoyaltyCard | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("loyalty_cards")
    .select("*")
    .eq("location_id", locationId)
    .eq("phone", phone)
    .single();
  return data ?? null;
}

export async function createLoyaltyCard(locationId: number, phone: string): Promise<LoyaltyCard> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("loyalty_cards")
    .insert({ location_id: locationId, phone, stamps_count: 1, last_stamp_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw new Error(`Failed to create loyalty card: ${error.message}`);
  return data;
}

export async function incrementStamp(cardId: number): Promise<LoyaltyCard> {
  const supabase = createAdminClient();
  const { data: current, error: fetchError } = await supabase
    .from("loyalty_cards")
    .select("stamps_count")
    .eq("id", cardId)
    .single();
  if (fetchError) throw new Error(`Failed to fetch loyalty card: ${fetchError.message}`);

  const newCount = (current.stamps_count ?? 0) + 1;
  const { data, error } = await supabase
    .from("loyalty_cards")
    .update({ stamps_count: newCount, last_stamp_at: new Date().toISOString() })
    .eq("id", cardId)
    .select()
    .single();
  if (error) throw new Error(`Failed to increment stamp: ${error.message}`);
  return data;
}

export async function resetLoyaltyCard(cardId: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("loyalty_cards")
    .update({ stamps_count: 0, last_stamp_at: null })
    .eq("id", cardId);
  if (error) throw new Error(`Failed to reset loyalty card: ${error.message}`);
}

export async function upsertOtp(phone: string, code: string, expiresAt: Date): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("loyalty_otp").upsert({
    phone,
    otp_code: code,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error(`Failed to upsert OTP: ${error.message}`);
}

export async function getOtp(phone: string): Promise<LoyaltyOtp | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("loyalty_otp").select("*").eq("phone", phone).single();
  return data ?? null;
}

export async function deleteOtp(phone: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("loyalty_otp").delete().eq("phone", phone);
}

// Google Sign-In isn't an enforced identity — phone is — so this just keeps
// a record of which email(s) a phone number has shown up with. A phone can
// pick up more than one email over time if signed in with a different
// Google account later.
export async function linkLoyaltyEmail(phone: string, email: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("loyalty_account_emails")
    .upsert({ phone, email }, { onConflict: "phone,email", ignoreDuplicates: true });
  if (error) throw new Error(`Failed to link loyalty email: ${error.message}`);
}
