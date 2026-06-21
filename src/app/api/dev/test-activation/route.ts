import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { setActivationToken } from "@/lib/db/portal";
import { sendPortalActivation } from "@/lib/email";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "dev only" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const targetEmail = "vikbobinski@gmail.com";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Migration already applied via supabase db push

  // 2. List all customers
  const { data: customers } = await supabase
    .from("customers")
    .select("customer_id, customer_name, email, is_activated")
    .order("customer_id");

  if (!customers || customers.length === 0) {
    return NextResponse.json({ error: "No customers found" }, { status: 404 });
  }

  // 3. Take first customer, update email
  const customer = customers[0];
  const originalEmail = customer.email;

  await supabase
    .from("customers")
    .update({ email: targetEmail })
    .eq("customer_id", customer.customer_id);

  // 4. Generate activation token
  const token = crypto.randomUUID();
  try {
    await setActivationToken(customer.customer_id, token);
  } catch (e) {
    return NextResponse.json({
      error: "Could not set activation_token — run migration first",
      hint: "Go to Supabase SQL Editor and run: ALTER TABLE customers ADD COLUMN activation_token TEXT UNIQUE; ALTER TABLE customers ADD COLUMN is_activated BOOLEAN NOT NULL DEFAULT false;",
      customers,
    }, { status: 500 });
  }

  // 5. Send activation email
  const activationUrl = `${appUrl}/portal/activate?token=${token}`;

  try {
    await sendPortalActivation(targetEmail, "pl", {
      customerName: customer.customer_name,
      activationUrl,
    });
  } catch (emailErr: any) {
    return NextResponse.json({
      message: "Token created but email failed — use link directly",
      activationUrl,
      error: emailErr.message,
      customer: { ...customer, email: targetEmail, originalEmail },
    });
  }

  return NextResponse.json({
    message: "Activation email sent!",
    activationUrl,
    customer: {
      ...customer,
      email: targetEmail,
      originalEmail,
    },
    allCustomers: customers,
  });
}
