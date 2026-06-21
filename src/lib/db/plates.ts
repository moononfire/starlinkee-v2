import { createAdminClient } from "../supabase/admin";
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

export async function incrementPlateVisits(plateId: number): Promise<void> {
  const supabase = createAdminClient();
  await supabase.rpc("increment_plate_visits", { p_plate_id: plateId });
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

export async function assignPlateToSubscription(
  plateId: number,
  subscriptionId: number
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("plates")
    .update({ subscription_id: subscriptionId })
    .eq("plate_id", plateId);
}

export async function assignNfcToPlate(
  plateNumber: string,
  nfcUid: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("plates")
    .update({ nfc_uid: nfcUid })
    .eq("plate_number", plateNumber.toUpperCase());
  if (error) throw new Error(`Failed to assign NFC: ${error.message}`);
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
    query = query.ilike("plate_number", `%${search}%`);
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
