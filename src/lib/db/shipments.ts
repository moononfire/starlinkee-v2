import { createAdminClient } from "../supabase/admin";
import type { Shipment } from "../types";

export interface ShipmentWithCustomer extends Shipment {
  customer_name: string;
}

export async function listShipments(): Promise<ShipmentWithCustomer[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("shipments")
    .select("*, orders(customers(customer_name))")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list shipments: ${error.message}`);
  return (data ?? []).map((row: any) => ({
    ...row,
    customer_name: row.orders?.customers?.customer_name ?? "",
  }));
}

export async function createShipmentFull(data: {
  order_id: number;
  tracking_number?: string;
  carrier?: string;
  shipped_at?: string;
  recipient_name?: string;
  recipient_email?: string;
  recipient_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  number_of_plates?: number;
  batch_label?: string;
  shipping_cost?: number;
}): Promise<void> {
  const supabase = createAdminClient();
  const shipping_status = data.shipped_at ? "shipped" : "pending";
  const { error } = await supabase.from("shipments").insert({ ...data, shipping_status });
  if (error) throw new Error(`Failed to create shipment: ${error.message}`);
}

export async function updateShipmentStatus(
  id: number,
  status: Shipment["shipping_status"],
  trackingNumber?: string,
  carrier?: string
): Promise<void> {
  const supabase = createAdminClient();
  const update: Record<string, unknown> = { shipping_status: status };
  if (trackingNumber !== undefined) update.tracking_number = trackingNumber;
  if (carrier !== undefined) update.carrier = carrier;
  if (status === "shipped") update.shipped_at = new Date().toISOString();
  if (status === "delivered") update.delivered_at = new Date().toISOString();
  const { error } = await supabase.from("shipments").update(update).eq("id", id);
  if (error) throw new Error(`Failed to update shipment: ${error.message}`);
}
