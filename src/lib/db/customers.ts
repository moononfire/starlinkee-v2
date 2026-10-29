import { createAdminClient } from "../supabase/admin";
import { ilikeValue } from "./search";
import { normalizeEmail, escapeLikePattern } from "../customer-email";
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
  address_line1?: string;
  address_city?: string;
  address_postal_code?: string;
  country?: string;
  preferred_language?: "en" | "de" | "pl";
  is_activated?: boolean;
}

/**
 * Finds the customer for this email or creates one. An existing customer's
 * data is never overwritten (checkout/webhook emails are unverified, so a
 * stranger paying with someone else's address must not rewrite their billing
 * details); only fields that are still empty are filled in.
 */
export async function upsertCustomerByEmail(input: CustomerInsert): Promise<number> {
  const supabase = createAdminClient();
  const data = { ...input, email: normalizeEmail(input.email) };

  const { data: existing } = await supabase
    .from("customers")
    .select("*")
    .ilike("email", escapeLikePattern(data.email))
    .order("customer_id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { email: _email, preferred_language: _preferredLanguage, source: _source, ...candidates } = data;
    const fill: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(candidates)) {
      if (value === undefined || value === null || value === "") continue;
      if (key === "is_activated") {
        if (value === true && existing.is_activated !== true) fill[key] = true;
        continue;
      }
      const current = (existing as Record<string, unknown>)[key];
      if (current === undefined || current === null || current === "") fill[key] = value;
    }
    if (Object.keys(fill).length > 0) {
      const { error } = await supabase.from("customers").update(fill).eq("customer_id", existing.customer_id);
      if (error) throw new Error(`Failed to update customer: ${error.message}`);
    }
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
    const pattern = ilikeValue(search);
    query = query.or(
      `customer_name.ilike.${pattern},email.ilike.${pattern},company_name.ilike.${pattern}`
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

  if (updates.email) {
    const email = normalizeEmail(updates.email);
    updates = { ...updates, email };
    const { data: existing } = await supabase
      .from("customers")
      .select("customer_id")
      .ilike("email", escapeLikePattern(email))
      .neq("customer_id", id)
      .limit(1)
      .maybeSingle();
    if (existing) throw new Error("Ten adres e-mail jest już przypisany do innego klienta.");
  }

  const { data: customer, error } = await supabase
    .from("customers")
    .update(updates)
    .eq("customer_id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update customer: ${error.message}`);
  return customer;
}

export async function createCustomer(input: CustomerInsert): Promise<Customer> {
  const supabase = createAdminClient();
  const data = input.email ? { ...input, email: normalizeEmail(input.email) } : input;

  if (data.email) {
    const { data: existing } = await supabase
      .from("customers")
      .select("customer_id")
      .ilike("email", escapeLikePattern(data.email))
      .limit(1)
      .maybeSingle();
    if (existing) throw new Error("Ten adres e-mail jest już przypisany do innego klienta.");
  }

  const { data: customer, error } = await supabase
    .from("customers")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`Failed to create customer: ${error.message}`);
  return customer;
}
