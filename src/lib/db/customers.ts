import { createAdminClient } from "../supabase/admin";
import type { Customer } from "../types";

interface CustomerInsert {
  customer_type: "business" | "individual";
  source: string;
  company_name?: string;
  tax_id?: string;
  customer_name: string;
  email: string;
  phone?: string;
  billing_address?: string;
  country?: string;
  preferred_language?: "en" | "de" | "pl";
}

export async function upsertCustomerByEmail(data: CustomerInsert): Promise<number> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("customers")
    .select("customer_id")
    .eq("email", data.email)
    .single();

  if (existing) {
    const { email: _email, ...updateFields } = data;
    const { error } = await supabase
      .from("customers")
      .update(updateFields)
      .eq("customer_id", existing.customer_id);
    if (error) throw new Error(`Failed to update customer: ${error.message}`);
    return existing.customer_id;
  }

  const { data: customer, error } = await supabase
    .from("customers")
    .insert(data)
    .select("customer_id")
    .single();

  if (error) throw new Error(`Failed to create customer: ${error.message}`);
  return customer.customer_id;
}

export async function listCustomers(search?: string): Promise<Customer[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `customer_name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list customers: ${error.message}`);
  return data ?? [];
}

export async function getCustomerById(id: number): Promise<Customer | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("customer_id", id)
    .single();
  return data ?? null;
}

export async function updateCustomer(
  id: number,
  updates: Partial<Omit<Customer, "customer_id" | "created_at" | "updated_at">>
): Promise<Customer> {
  const supabase = createAdminClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("customer_id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update customer: ${error.message}`);
  return customer;
}

export async function createCustomer(data: CustomerInsert): Promise<Customer> {
  const supabase = createAdminClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`Failed to create customer: ${error.message}`);
  return customer;
}
