import Stripe from "stripe";
import { upsertCustomerByEmail } from "../db/customers";
import { createOrder, createOrderItem, createShipment } from "../db/orders";
import { createSubscription } from "../db/subscriptions";
import { sendOrderConfirmationToAdmin } from "../email";

// Product IDs match the seeded products table
const SUBSCRIPTION_PRODUCT_ID = 1; // 1_YEAR_SUB
const PLATE_PRODUCT_ID = 2;        // PLATE
const SUBSCRIPTION_NAME = "1_YEAR_SUB";
const SUBSCRIPTION_DURATION_DAYS = 365;

function getPriceId(price: string | Stripe.Price | null | undefined): string | undefined {
  if (!price) return undefined;
  return typeof price === "string" ? price : price.id;
}

export async function processInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const email = invoice.customer_email;
  if (!email) {
    console.error(`[stripe] invoice ${invoice.id} has no customer_email — skipping`);
    return;
  }

  // 1. Create or find customer
  const hasTaxId = (invoice.customer_tax_ids?.length ?? 0) > 0;
  const billingAddress = [
    invoice.customer_address?.line1,
    invoice.customer_address?.line2,
    invoice.customer_address?.city,
    invoice.customer_address?.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  const customerId = await upsertCustomerByEmail({
    email,
    customer_name: invoice.customer_name ?? email,
    customer_type: hasTaxId ? "business" : "individual",
    source: "Stripe",
    company_name: hasTaxId ? (invoice.customer_name ?? undefined) : undefined,
    tax_id: hasTaxId ? (invoice.customer_tax_ids?.[0]?.value ?? undefined) : undefined,
    billing_address: billingAddress || undefined,
    country: invoice.customer_address?.country ?? undefined,
    phone: invoice.customer_phone ?? undefined,
  });

  // 2. Create order — paid + fulfilled immediately per business rules
  // In Stripe SDK v22 the payment intent is accessed via invoice.payments
  const firstPayment = invoice.payments?.data?.[0];
  const paymentIntentRaw = firstPayment?.payment?.payment_intent;
  const paymentIntentId = paymentIntentRaw
    ? (typeof paymentIntentRaw === "string" ? paymentIntentRaw : paymentIntentRaw.id)
    : undefined;

  const orderId = await createOrder({
    customer_id: customerId,
    status: "paid",
    payment_method: "stripe",
    stripe_payment_id: invoice.id,
    stripe_payment_intent_id: paymentIntentId,
    fulfilled_at: new Date().toISOString(),
  });

  // 3. Process line items → order_items + subscriptions
  const priceId1YearSub = process.env.STRIPE_PRICE_ID_1_YEAR_SUB;
  let totalPlates = 0;

  for (const line of invoice.lines.data) {
    // In Stripe SDK v22, price is under line.pricing.price_details.price
    const linePriceId = getPriceId(line.pricing?.price_details?.price);
    if (linePriceId !== priceId1YearSub) continue;

    const qty = line.quantity ?? 1;
    totalPlates += qty;

    await createOrderItem(orderId, SUBSCRIPTION_PRODUCT_ID, qty);
    await createOrderItem(orderId, PLATE_PRODUCT_ID, qty);

    // 4. One subscription per purchased unit (status=pending, dates=NULL)
    for (let i = 0; i < qty; i++) {
      await createSubscription({
        customer_id: customerId,
        subscription_name: SUBSCRIPTION_NAME,
        duration_in_days: SUBSCRIPTION_DURATION_DAYS,
        is_free: false,
      });
    }
  }

  // 5. Create shipment
  const shipping = invoice.customer_shipping;
  await createShipment({
    order_id: orderId,
    recipient_name: shipping?.name ?? invoice.customer_name ?? undefined,
    address_line1: shipping?.address?.line1 ?? undefined,
    address_line2: shipping?.address?.line2 ?? undefined,
    city: shipping?.address?.city ?? undefined,
    postal_code: shipping?.address?.postal_code ?? undefined,
    country: shipping?.address?.country ?? undefined,
  });

  // 6. Notify admin (non-blocking — failure must not abort the webhook)
  sendOrderConfirmationToAdmin({
    orderId,
    customerName: invoice.customer_name ?? email,
    customerEmail: email,
    plateCount: totalPlates,
  }).catch((err) => console.error("[stripe] admin email failed:", err));
}
