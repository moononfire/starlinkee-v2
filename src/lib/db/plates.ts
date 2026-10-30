import { createAdminClient } from "../supabase/admin";
import { likePattern } from "./search";
import { SUPPORTED_LANGUAGES } from "../languages";
import type { Plate } from "../types";

export async function getPlateByNumber(plateNumber: string): Promise<Plate | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("plates")
    .select("*")
    .eq("plate_number", plateNumber.toUpperCase())
    .single();
  return data ?? null;
}

export async function getPlateById(plateId: number): Promise<Plate | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("plates")
    .select("*")
    .eq("plate_id", plateId)
    .single();
  return data ?? null;
}

export async function incrementPlateVisits(plateId: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("increment_plate_visits", { p_plate_id: plateId });
  if (error) throw new Error(`Failed to increment plate visits: ${error.message}`);
}

export async function plateExists(plateNumber: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("plates")
    .select("plate_id", { count: "exact", head: true })
    .eq("plate_number", plateNumber.toUpperCase());
  return (count ?? 0) > 0;
}

export async function getPlatesBySubscriptionId(subscriptionId: number): Promise<Plate[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("plates")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

/**
 * Assigns a free plate to a subscription. Conditional (`subscription_id IS NULL`), so a stale form or a second
 * window cannot overwrite another assignment. Returns true when the plate now belongs to this subscription
 * (including "already assigned to it", so retries are safe); false when it is missing or belongs to another one.
 * Throws on a database error.
 */
/**
 * A customer without a language yet (www checkout sent no locale) takes the language of the first plate they get,
 * so portal and e-mails speak it from then on. A language that is already set is never touched. Best effort:
 * the plate is assigned either way.
 */
async function adoptPlateLanguage(plateLanguage: unknown, subscriptionId: number): Promise<void> {
  if (!SUPPORTED_LANGUAGES.includes(plateLanguage as (typeof SUPPORTED_LANGUAGES)[number])) return;
  const supabase = createAdminClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("customer_id")
    .eq("subscription_id", subscriptionId)
    .maybeSingle();
  if (!subscription) return;
  const { error } = await supabase
    .from("customers")
    .update({ preferred_language: plateLanguage })
    .eq("customer_id", subscription.customer_id)
    .is("preferred_language", null);
  if (error) console.error(`[plates] could not set the language of customer ${subscription.customer_id}:`, error.message);
}

export async function assignPlateToSubscription(
  plateId: number,
  subscriptionId: number
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("plates")
    .update({ subscription_id: subscriptionId })
    .eq("plate_id", plateId)
    .is("subscription_id", null)
    .select("plate_id, plate_language");
  if (error) throw new Error(`Failed to assign plate: ${error.message}`);
  if (data && data.length > 0) {
    await adoptPlateLanguage(data[0].plate_language, subscriptionId);
    return true;
  }

  const { data: plate, error: readError } = await supabase
    .from("plates")
    .select("subscription_id")
    .eq("plate_id", plateId)
    .maybeSingle();
  if (readError) throw new Error(`Failed to read plate: ${readError.message}`);
  return plate?.subscription_id === subscriptionId;
}

/** Undoes an assignment made by the same flow (only if the plate still belongs to that subscription). */
export async function unassignPlateFromSubscription(plateId: number, subscriptionId: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("plates")
    .update({ subscription_id: null })
    .eq("plate_id", plateId)
    .eq("subscription_id", subscriptionId);
  if (error) throw new Error(`Failed to unassign plate: ${error.message}`);
}

export async function listPlateNumbersBySubscription(subscriptionId: number): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("plates")
    .select("plate_number")
    .eq("subscription_id", subscriptionId)
    .order("plate_id");
  return (data ?? []).map((p) => p.plate_number);
}

/**
 * Binds an NFC UID to a plate only if it is still untagged. Returns false when
 * another request tagged it first (two parallel assignments must not both win).
 */
export async function assignNfcToPlate(
  plateNumber: string,
  nfcUid: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("plates")
    .update({ nfc_uid: nfcUid, nfc_assigned_at: new Date().toISOString() })
    .eq("plate_number", plateNumber.toUpperCase())
    .is("nfc_uid", null)
    .select("plate_id");
  if (error) throw new Error(`Failed to assign NFC: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

export async function insertPlatesBatch(
  plates: { plate_number: string; plate_language: string; secret_key: string }[]
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("plates").insert(plates);
  if (error) throw new Error(`Batch insert failed: ${error.message}`);
}

export interface PlateWithSubscription extends Plate {
  subscription_name: string | null;
  customer_name: string | null;
}

export async function listPlates(search?: string): Promise<PlateWithSubscription[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("plates")
    .select("*, subscriptions(subscription_name, customers(customer_name))")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("plate_number", likePattern(search));
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list plates: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    ...row,
    subscription_name: row.subscriptions?.subscription_name ?? null,
    customer_name: row.subscriptions?.customers?.customer_name ?? null,
  }));
}

export async function listUnassignedPlates(): Promise<Plate[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("plates")
    .select("*")
    .is("subscription_id", null)
    .order("plate_number");
  if (error) throw new Error(`Failed to list unassigned plates: ${error.message}`);
  return data ?? [];
}

export async function generateUniquePlateCodes(count: number): Promise<string[]> {
  const supabase = createAdminClient();
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const generated: string[] = [];

  while (generated.length < count) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    let attempts = 0;
    let unique = false;
    while (attempts < 10 && !unique) {
      const { count: existing } = await supabase
        .from("plates")
        .select("plate_id", { count: "exact", head: true })
        .eq("plate_number", code);
      if ((existing ?? 0) === 0 && !generated.includes(code)) {
        unique = true;
      } else {
        code = "";
        for (let i = 0; i < 6; i++) {
          code += chars[Math.floor(Math.random() * chars.length)];
        }
        attempts++;
      }
    }
    if (unique) generated.push(code);
  }

  return generated;
}
