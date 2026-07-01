import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import Stripe from "stripe";
import { processInvoicePaymentSucceeded, processRenewalInvoicePaid } from "@/lib/services/stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook verification failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const isRenewal = Boolean(invoice.parent?.subscription_details?.metadata?.renewal_subscription_id);
    // Process after response is sent — Stripe only needs a 200 ACK
    after(async () => {
      try {
        if (isRenewal) {
          await processRenewalInvoicePaid(invoice);
        } else {
          await processInvoicePaymentSucceeded(invoice);
        }
      } catch (err) {
        console.error("[stripe webhook] processing failed:", err);
      }
    });
  }

  return NextResponse.json({ received: true });
}
