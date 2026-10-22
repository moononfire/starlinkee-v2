import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { processStripeInvoice } from "@/lib/services/stripe";
import { claimStripeEvent, markStripeEventDone, markStripeEventFailed } from "@/lib/db/stripe-events";

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

  if (event.type !== "invoice.payment_succeeded") {
    return NextResponse.json({ received: true });
  }

  // Stripe delivers at least once: a redelivery of an event we already
  // handled (or are handling) must not create a second order/shipment.
  if ((await claimStripeEvent(event.id)) === "duplicate") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await processStripeInvoice(event.data.object as Stripe.Invoice);
    await markStripeEventDone(event.id);
  } catch (err) {
    console.error("[stripe webhook] processing failed:", err);
    await markStripeEventFailed(event.id, err instanceof Error ? err.message : String(err)).catch(() => {});
    // Non-2xx makes Stripe retry; the claim + per-invoice idempotency make that safe.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
