import Stripe from "stripe";
import { upsertCustomerByEmail } from "../db/customers";
import { createOrder, createOrderItem, createShipment } from "../db/orders";
import { createSubscription, setSubscriptionActive } from "../db/subscriptions";
import {
  sendOrderConfirmationToAdmin,
  sendPortalActivation,
  sendRenewalConfirmation,
  sendRenewalConfirmationToAdmin,
} from "../email";
import { setActivationToken, getCustomerByEmail } from "../db/portal";
import { getCustomerById } from "../db/customers";
import { assignPlateToSubscription } from "../db/plates";

// Product IDs match the seeded products table
const SUBSCRIPTION_PRODUCT_ID = 1; // 1_YEAR_SUB
const PLATE_PRODUCT_ID = 2;        // PLATE
const SUBSCRIPTION_DURATION_DAYS = 365;

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function getPriceId(price: string | Stripe.Price | null | undefined): string | undefined {
  if (!price) return undefined;
  return typeof price === "string" ? price : price.id;
}

function toCustomerLanguage(lang: string | undefined): "en" | "de" | "pl" {
  return lang === "de" || lang === "pl" ? lang : "en";
}

const RENEWAL_DURATION_DAYS: Record<"month" | "year", number> = {
  month: 30,
  year: 365,
};

export async function createRenewalCheckoutSession(params: {
  plateId: number;
  subscriptionId: number | null;
  plateNumber: string;
  plateSecret: string;
  lang: string;
  interval: "month" | "year";
}): Promise<string> {
  const { plateId, subscriptionId, plateNumber, plateSecret, lang, interval } = params;
  const priceId = interval === "year"
    ? process.env.STRIPE_PRICE_ID_RENEWAL_YEARLY
    : process.env.STRIPE_PRICE_ID_RENEWAL_MONTHLY;
  if (!priceId) {
    throw new Error(`STRIPE_PRICE_ID_RENEWAL_${interval === "year" ? "YEARLY" : "MONTHLY"} is not configured`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://starlinkee.com";
  const plateUrl = `${appUrl}/plate/${plateNumber}/${plateSecret}`;

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    locale: ["en", "de", "pl"].includes(lang) ? (lang as Stripe.Checkout.SessionCreateParams.Locale) : "auto",
    success_url: plateUrl,
    cancel_url: plateUrl,
    subscription_data: {
      metadata: {
        ...(subscriptionId
          ? { renewal_subscription_id: String(subscriptionId) }
          : { renewal_plate_id: String(plateId) }),
        plate_number: plateNumber,
        renewal_duration_days: String(RENEWAL_DURATION_DAYS[interval]),
        renewal_interval: interval,
        plate_language: lang,
      },
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }
  return session.url;
}

export async function processRenewalInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const metadata = invoice.parent?.subscription_details?.metadata;
  if (!metadata) return;

  const durationDays = Number(metadata.renewal_duration_days) || RENEWAL_DURATION_DAYS.month;
  const now = new Date();
  const expiration = new Date(now);
  expiration.setDate(expiration.getDate() + durationDays);

  const plateNumber = metadata.plate_number ?? "";
  const interval = metadata.renewal_interval === "year" ? "year" : "month";
  const email = invoice.customer_email;

  const existingSubscriptionId = Number(metadata.renewal_subscription_id);
  if (existingSubscriptionId) {
    await setSubscriptionActive(existingSubscriptionId, now.toISOString(), expiration.toISOString());

    if (email) {
      const customer = await getCustomerByEmail(email);
      const lang = customer?.preferred_language ?? metadata.plate_language ?? "en";
      sendRenewalConfirmation(email, lang, { plateNumber }).catch((err) =>
        console.error("[stripe] renewal confirmation email failed:", err)
      );
    }
    sendRenewalConfirmationToAdmin({
      plateNumber,
      customerEmail: email ?? "unknown",
      interval,
    }).catch((err) => console.error("[stripe] renewal admin email failed:", err));
    return;
  }

  const plateId = Number(metadata.renewal_plate_id);
  if (!plateId) return;

  if (!email) {
    console.error(`[stripe] renewal invoice ${invoice.id} has no customer_email — skipping`);
    return;
  }

  const customerId = await upsertCustomerByEmail({
    email,
    customer_name: invoice.customer_name ?? email,
    customer_type: "individual",
    source: "Stripe",
    country: invoice.customer_address?.country ?? undefined,
    phone: invoice.customer_phone ?? undefined,
    preferred_language: toCustomerLanguage(metadata.plate_language),
  });

  // Left as "pending" — the plate page will show the setup form so the
  // customer can fill in their location before the subscription goes active.
  const subscription = await createSubscription({
    customer_id: customerId,
    subscription_name: "Subskrypcja",
    duration_in_days: durationDays,
    is_free: false,
  });

  await assignPlateToSubscription(plateId, subscription.subscription_id);

  sendRenewalConfirmationToAdmin({ plateNumber, customerEmail: email, interval }).catch((err) =>
    console.error("[stripe] renewal admin email failed:", err)
  );
}

export async function processInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const email = invoice.customer_email;
  if (!email) {
    console.error(`[stripe] invoice ${invoice.id} has no customer_email — skipping`);
    return;
  }

  // 1. Create or update customer
  const hasTaxId = (invoice.customer_tax_ids?.length ?? 0) > 0;
  const billingAddress = [
    invoice.customer_address?.line1,
    invoice.customer_address?.line2,
    invoice.customer_address?.city,
    invoice.customer_address?.postal_code,
  ]
    .filter(Boolean)
    .join(", ");

  let companyName: string | undefined;
  if (hasTaxId) {
    const stripeCustomerId = typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
    if (stripeCustomerId) {
      const stripeCustomer = await getStripe().customers.retrieve(stripeCustomerId);
      if (!stripeCustomer.deleted) {
        companyName = stripeCustomer.business_name ?? undefined;
      }
    }
  }

  const countryLanguage =
    invoice.customer_address?.country === "DE"
      ? "de"
      : invoice.customer_address?.country === "PL"
        ? "pl"
        : "en";

  const customerId = await upsertCustomerByEmail({
    email,
    customer_name: invoice.customer_name ?? email,
    customer_type: hasTaxId ? "business" : "individual",
    source: "Stripe",
    company_name: companyName,
    tax_id: hasTaxId ? (invoice.customer_tax_ids?.[0]?.value ?? undefined) : undefined,
    billing_address: billingAddress || undefined,
    country: invoice.customer_address?.country ?? undefined,
    phone: invoice.customer_phone ?? undefined,
    preferred_language: countryLanguage,
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
        subscription_name: "Subskrypcja",
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

  // 6. Generate activation token and send portal activation email
  const activationToken = crypto.randomUUID();
  await setActivationToken(customerId, activationToken);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://starlinkee.com";
  const activationUrl = `${appUrl}/portal/activate?token=${activationToken}`;
  const customer = await getCustomerById(customerId);
  const language = customer?.preferred_language ?? countryLanguage;

  sendPortalActivation(email, language, {
    customerName: invoice.customer_name ?? email,
    activationUrl,
  }).catch((err) => console.error("[stripe] activation email failed:", err));

  // 7. Notify admin (non-blocking — failure must not abort the webhook)
  sendOrderConfirmationToAdmin({
    orderId,
    customerName: invoice.customer_name ?? email,
    customerEmail: email,
    plateCount: totalPlates,
  }).catch((err) => console.error("[stripe] admin email failed:", err));
}
