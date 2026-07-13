import { createAdminClient } from "../supabase/admin";
import type { LoyaltyCard } from "../types";

export async function getLoyaltyCard(locationId: number, customerUserId: string): Promise<LoyaltyCard | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("loyalty_cards")
    .select("*")
    .eq("location_id", locationId)
    .eq("customer_user_id", customerUserId)
    .single();
  return data ?? null;
}

export async function createLoyaltyCard(locationId: number, customerUserId: string): Promise<LoyaltyCard> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("loyalty_cards")
    .insert({ location_id: locationId, customer_user_id: customerUserId, stamps_count: 1, last_stamp_at: new Date().toISOString() })
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
