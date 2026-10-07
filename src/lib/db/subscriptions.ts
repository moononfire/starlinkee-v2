import { createAdminClient } from "../supabase/admin";
import { ilikeValue, likePattern } from "./search";
import type { Subscription } from "../types";

export async function getSubscriptionById(id: number): Promise<Subscription | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("subscription_id", id)
    .single();
  if (!data) return null;

  // Lazily flip past-due subscriptions to "inactive" on read — there's no cron
  // expiring these, so without this an active-but-unpaid subscription would
  // never surface the renewal screen to the customer.
  if (
    data.status === "active" &&
    data.expiration_datetime &&
    new Date(data.expiration_datetime) < new Date()
  ) {
    await supabase.from("subscriptions").update({ status: "inactive" }).eq("subscription_id", id);
    data.status = "inactive";
  }

  return data;
}

export async function deactivateExpiredSubscriptions(): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .update({ status: "inactive" })
    .eq("status", "active")
    .lt("expiration_datetime", new Date().toISOString())
    .select("subscription_id");
  if (error) throw new Error(`Failed to deactivate expired subscriptions: ${error.message}`);
  return data?.length ?? 0;
}

export async function setSubscriptionActive(
  subscriptionId: number,
  activationDatetime: string,
  expirationDatetime: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      activation_datetime: activationDatetime,
      expiration_datetime: expirationDatetime,
    })
    .eq("subscription_id", subscriptionId);
  if (error) throw new Error(`Failed to activate subscription: ${error.message}`);
}

export async function createSubscription(data: {
  customer_id: number;
  subscription_name: string;
  duration_in_days: number;
  is_free: boolean;
}): Promise<Subscription> {
  const supabase = createAdminClient();
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .insert({ ...data, status: "pending" })
    .select()
    .single();
  if (error) throw new Error(`Failed to create subscription: ${error.message}`);
  return sub;
}

export interface SubscriptionWithCustomer extends Subscription {
  customer_name: string;
  customer_email: string;
  plate_numbers: string[];
}

export async function listSubscriptions(search?: string): Promise<SubscriptionWithCustomer[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("subscriptions")
    .select("*, customers(customer_name, email), plates(plate_number)")
    .order("created_at", { ascending: false });

  const term = search?.trim();
  if (term) {
    const pattern = ilikeValue(term);
    const [customersRes, platesRes] = await Promise.all([
      supabase
        .from("customers")
        .select("customer_id")
        .or(`customer_name.ilike.${pattern},email.ilike.${pattern}`),
      supabase
        .from("plates")
        .select("subscription_id")
        .ilike("plate_number", likePattern(term))
        .not("subscription_id", "is", null),
    ]);
    if (customersRes.error) throw new Error(`Failed to list subscriptions: ${customersRes.error.message}`);
    if (platesRes.error) throw new Error(`Failed to list subscriptions: ${platesRes.error.message}`);

    const customerIds = (customersRes.data ?? []).map((c) => c.customer_id as number);
    const subscriptionIds = [
      ...new Set((platesRes.data ?? []).map((p) => p.subscription_id as number)),
    ];
    const clauses = [`subscription_name.ilike.${pattern}`];
    if (customerIds.length > 0) clauses.push(`customer_id.in.(${customerIds.join(",")})`);
    if (subscriptionIds.length > 0) clauses.push(`subscription_id.in.(${subscriptionIds.join(",")})`);
    query = query.or(clauses.join(","));
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list subscriptions: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    ...row,
    customer_name: row.customers?.customer_name ?? "",
    customer_email: row.customers?.email ?? "",
    plate_numbers: (row.plates ?? []).map((p: any) => p.plate_number),
  }));
}
