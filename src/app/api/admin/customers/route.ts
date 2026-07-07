import { NextRequest, NextResponse } from "next/server";
import { updateCustomer } from "@/lib/db/customers";

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { customer_id, ...updates } = body;

  if (!customer_id) {
    return NextResponse.json({ error: "customer_id required" }, { status: 400 });
  }

  const customer = await updateCustomer(customer_id, updates);

  return NextResponse.json({ customer });
}
