import { createAdminClient } from "../supabase/admin";
import type { Subscription } from "../types";

export async function getSubscriptionById(id: number): Promise<Subscription | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("subscription_id", id)
    .single();
  return data ?? null;
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
}

export async function listSubscriptions(search?: string): Promise<SubscriptionWithCustomer[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("subscriptions")
    .select("*, customers(customer_name, email)")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `subscription_name.ilike.%${search}%,customers.customer_name.ilike.%${search}%,customers.email.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list subscriptions: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    ...row,
    customer_name: row.customers?.customer_name ?? "",
    customer_email: row.customers?.email ?? "",
  }));
}
