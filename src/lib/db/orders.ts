import { createAdminClient } from "../supabase/admin";
import type { Order } from "../types";

export async function createOrder(data: {
  customer_id: number;
  status: "paid";
  payment_method: "stripe";
  stripe_payment_id: string;
  stripe_payment_intent_id?: string;
  fulfilled_at: string;
}): Promise<number> {
  const supabase = createAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .insert(data)
    .select("order_id")
    .single();
  if (error) throw new Error(`Failed to create order: ${error.message}`);
  return order.order_id;
}

export async function createOrderItem(
  orderId: number,
  productId: number,
  quantity: number
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("order_items")
    .insert({ order_id: orderId, product_id: productId, quantity });
  if (error) throw new Error(`Failed to create order item: ${error.message}`);
}

export async function createShipment(data: {
  order_id: number;
  recipient_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("shipments").insert(data);
  if (error) throw new Error(`Failed to create shipment: ${error.message}`);
}

export interface OrderItem {
  quantity: number;
  product_name: string;
}

export interface OrderWithCustomer extends Order {
  customer_name: string;
  customer_email: string;
  items: OrderItem[];
}

export async function listOrders(search?: string): Promise<OrderWithCustomer[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("orders")
    .select("*, customers(customer_name, email), order_items(quantity, products(name))")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `customers.customer_name.ilike.%${search}%,customers.email.ilike.%${search}%,stripe_payment_id.ilike.%${search}%,internal_payment_reference.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list orders: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    ...row,
    customer_name: row.customers?.customer_name ?? "",
    customer_email: row.customers?.email ?? "",
    items: (row.order_items ?? []).map((item: any) => ({
      quantity: item.quantity,
      product_name: item.products?.name ?? "?",
    })),
  }));
}

export async function listOrdersReadyToShip(): Promise<OrderWithCustomer[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, customers(customer_name, email), order_items(quantity, products(name))")
    .eq("status", "paid")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list orders: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    ...row,
    customer_name: row.customers?.customer_name ?? "",
    customer_email: row.customers?.email ?? "",
    items: (row.order_items ?? []).map((item: any) => ({
      quantity: item.quantity,
      product_name: item.products?.name ?? "?",
    })),
  }));
}

export async function createOrderManual(data: {
  customer_id: number;
  payment_method: "bank_transfer" | "cash";
  internal_payment_reference?: string;
}): Promise<number> {
  const supabase = createAdminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      ...data,
      status: "paid",
      fulfilled_at: new Date().toISOString(),
    })
    .select("order_id")
    .single();
  if (error) throw new Error(`Failed to create order: ${error.message}`);
  return order.order_id;
}
