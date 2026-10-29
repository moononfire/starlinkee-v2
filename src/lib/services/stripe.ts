import { ownerLanguage, languageFromCountry } from "@/lib/languages";
import Stripe from "stripe";
import type { Subscription } from "../types";
import { upsertCustomerByEmail } from "../db/customers";
import {
  createOrder,
  createOrderItem,
  createShipment,
  getOrderIdByStripePaymentId,
  orderHasItems,
  orderHasShipment,
} from "../db/orders";
import {
  createSubscription,
  setSubscriptionActive,
  getSubscriptionById,
  listSubscriptionsByStripeInvoice,
  listSubscriptionsByStripeSubscription,
} from "../db/subscriptions";
import {
  sendOrderConfirmationToAdmin,
  sendPortalCredentials,
  sendRenewalConfirmation,
  sendRenewalConfirmationToAdmin,
} from "../email";
import { getCustomerByEmail } from "../db/portal";
import { getCustomerById } from "../db/customers";
import { assignPlateToSubscription, getPlateById } from "../db/plates";
import { issueActivationCode } from "./activation";
import { createConfirmedPortalUser } from "./portal-account";
import { generateRandomPassword } from "../password";

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

const RENEWAL_DURATION_DAYS: Record<"month" | "year", number> = {
  month: 30,
  year: 365,
};

export async function createRenewalCheckoutSession(params: {
  subscriptionId: number;
  plateNumber: string;
  returnUrl: string;
  lang: string;
  interval: "month" | "year";
}): Promise<string> {
  const { subscriptionId, plateNumber, returnUrl, lang, interval } = params;
  const priceId = interval === "year"
    ? process.env.STRIPE_PRICE_ID_RENEWAL_YEARLY
    : process.env.STRIPE_PRICE_ID_RENEWAL_MONTHLY;
  if (!priceId) {
    throw new Error(`STRIPE_PRICE_ID_RENEWAL_${interval === "year" ? "YEARLY" : "MONTHLY"} is not configured`);
  }

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    locale: ["en", "de", "pl", "it"].includes(lang) ? (lang as Stripe.Checkout.SessionCreateParams.Locale) : "auto",
    success_url: returnUrl,
    cancel_url: returnUrl,
    subscription_data: {
      metadata: {
        renewal_subscription_id: String(subscriptionId),
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

function stripeSubscriptionIdOf(invoice: Stripe.Invoice): string | undefined {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return undefined;
  return typeof sub === "string" ? sub : sub.id;
}

/** End of the period this invoice paid for (latest line period end), if Stripe reports one. */
function paidThrough(invoice: Stripe.Invoice): Date | null {
  const ends = invoice.lines.data
    .map((line) => line.period?.end)
    .filter((end): end is number => typeof end === "number");
  if (ends.length === 0) return null;
  return new Date(Math.max(...ends) * 1000);
}

/**
 * Routes a paid invoice by billing_reason. Only the first invoice of a Stripe
 * subscription (subscription_create) sells something new; each later
 * subscription_cycle invoice just extends what was already created.
 */
export async function processStripeInvoice(invoice: Stripe.Invoice): Promise<void> {
  if (invoice.status && invoice.status !== "paid") {
    console.warn(`[stripe] invoice ${invoice.id} is ${invoice.status}, not paid — skipping`);
    return;
  }

  const renewalMetadata = invoice.parent?.subscription_details?.metadata;
  const isRenewal = Boolean(renewalMetadata?.renewal_subscription_id || renewalMetadata?.renewal_plate_id);
  const reason = invoice.billing_reason;

  if (reason === "subscription_create" || (reason === "manual" && !isRenewal)) {
    if (isRenewal) await processRenewalInvoicePaid(invoice, "create");
    else await processInvoicePaymentSucceeded(invoice);
    return;
  }

  if (reason === "subscription_cycle") {
    if (isRenewal) await processRenewalInvoicePaid(invoice, "cycle");
    else await extendSubscriptionsForCycle(invoice);
    return;
  }

  console.warn(`[stripe] invoice ${invoice.id} has billing_reason ${reason ?? "none"} — not processed`);
}

async function extendSubscriptionsForCycle(invoice: Stripe.Invoice): Promise<void> {
  const stripeSubscriptionId = stripeSubscriptionIdOf(invoice);
  const subs = stripeSubscriptionId ? await listSubscriptionsByStripeSubscription(stripeSubscriptionId) : [];
  if (subs.length === 0) {
    console.error(
      `[stripe] cycle invoice ${invoice.id}: no subscription linked to Stripe subscription ${stripeSubscriptionId ?? "?"} — needs manual follow-up`
    );
    return;
  }

  const now = new Date();
  const until = paidThrough(invoice);
  for (const sub of subs) {
    if (sub.status === "pending") continue; // never set up yet: the setup flow starts the period
    const expiration = until ?? new Date(now.getTime() + sub.duration_in_days * 86_400_000);
    await setSubscriptionActive(sub.subscription_id, now.toISOString(), expiration.toISOString());
  }
}

export async function processRenewalInvoicePaid(
  invoice: Stripe.Invoice,
  phase: "create" | "cycle" = "create"
): Promise<void> {
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
      const lang = ownerLanguage(customer, { plate_language: metadata.plate_language });
      await sendRenewalConfirmation(email, lang, { plateNumber }).catch((err) =>
        console.error("[stripe] renewal confirmation email failed:", err)
      );
    }
    await sendRenewalConfirmationToAdmin({
      plateNumber,
      customerEmail: email ?? "unknown",
      interval,
    }).catch((err) => console.error("[stripe] renewal admin email failed:", err));
    return;
  }

  const plateId = Number(metadata.renewal_plate_id);
  if (!plateId) return;

  const stripeSubscriptionId = stripeSubscriptionIdOf(invoice);

  if (phase === "cycle") {
    // Later billing cycles extend the subscription created by the first
    // invoice. They must not create another one or move the plate onto it.
    const linked = stripeSubscriptionId ? await listSubscriptionsByStripeSubscription(stripeSubscriptionId) : [];
    let target: Subscription | null = linked[0] ?? null;
    if (!target) {
      const plate = await getPlateById(plateId);
      target = plate?.subscription_id ? await getSubscriptionById(plate.subscription_id) : null;
    }
    if (!target) {
      console.error(`[stripe] renewal cycle invoice ${invoice.id}: no subscription found for plate ${plateId}`);
      return;
    }
    if (target.status !== "pending") {
      const expiration = paidThrough(invoice) ?? new Date(now.getTime() + durationDays * 86_400_000);
      await setSubscriptionActive(target.subscription_id, now.toISOString(), expiration.toISOString());
    }
    return;
  }

  // Retry safety: a previous attempt may have died part-way, so resume instead
  // of starting over or giving up: reuse the subscription already created for
  // this invoice and complete whatever is still missing.
  const existing = invoice.id ? (await listSubscriptionsByStripeInvoice(invoice.id))[0] ?? null : null;
  let subscription: Subscription | null = existing;
  const created = !existing;

  if (!subscription) {
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
      preferred_language: ownerLanguage(null, { plate_language: metadata.plate_language }),
    });

    // Left as "pending" — the plate page will show the setup form so the
    // customer can fill in their location before the subscription goes active.
    subscription = await createSubscription({
      customer_id: customerId,
      subscription_name: "Subskrypcja",
      duration_in_days: durationDays,
      is_free: false,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_invoice_id: invoice.id ?? undefined,
    });
  }

  const plate = await getPlateById(plateId);
  if (plate?.subscription_id !== subscription.subscription_id) {
    await assignPlateToSubscription(plateId, subscription.subscription_id);
  }
  // Without the code the customer cannot set the plate up (/api/plate/setup).
  if (!subscription.activation_code_hash && subscription.status === "pending") {
    await issueActivationCode(subscription.subscription_id);
  }

  if (created && email) {
    await sendRenewalConfirmationToAdmin({ plateNumber, customerEmail: email, interval }).catch((err) =>
      console.error("[stripe] renewal admin email failed:", err)
    );
  }
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

  const countryLanguage = languageFromCountry(invoice.customer_address?.country);

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
    is_activated: true,
  });

  // 2. Create order — paid + fulfilled immediately per business rules
  // In Stripe SDK v22 the payment intent is accessed via invoice.payments
  const firstPayment = invoice.payments?.data?.[0];
  const paymentIntentRaw = firstPayment?.payment?.payment_intent;
  const paymentIntentId = paymentIntentRaw
    ? (typeof paymentIntentRaw === "string" ? paymentIntentRaw : paymentIntentRaw.id)
    : undefined;

  // Retry safety: a redelivered/retried invoice resumes the order it already
  // created (unique per invoice) instead of creating a second one.
  const invoiceId = invoice.id ?? "";
  const existingOrderId = invoiceId ? await getOrderIdByStripePaymentId(invoiceId) : null;
  const orderId =
    existingOrderId ??
    (await createOrder({
      customer_id: customerId,
      status: "paid",
      payment_method: "stripe",
      stripe_payment_id: invoice.id,
      stripe_payment_intent_id: paymentIntentId,
      fulfilled_at: new Date().toISOString(),
    }));

  // 3. Process line items → order_items + subscriptions
  const priceId1YearSub = process.env.STRIPE_PRICE_ID_1_YEAR_SUB;
  let totalPlates = 0;
  for (const line of invoice.lines.data) {
    // In Stripe SDK v22, price is under line.pricing.price_details.price
    const linePriceId = getPriceId(line.pricing?.price_details?.price);
    if (linePriceId !== priceId1YearSub) continue;
    totalPlates += line.quantity ?? 1;
  }

  if (totalPlates > 0 && !(await orderHasItems(orderId))) {
    await createOrderItem(orderId, SUBSCRIPTION_PRODUCT_ID, totalPlates);
    await createOrderItem(orderId, PLATE_PRODUCT_ID, totalPlates);
  }

  // 4. One subscription per purchased unit (status=pending, dates=NULL),
  // linked to this invoice and Stripe subscription so cycles can extend them.
  const alreadyCreated = invoiceId ? (await listSubscriptionsByStripeInvoice(invoiceId)).length : 0;
  const stripeSubscriptionId = stripeSubscriptionIdOf(invoice);
  for (let i = alreadyCreated; i < totalPlates; i++) {
    await createSubscription({
      customer_id: customerId,
      subscription_name: "Subskrypcja",
      duration_in_days: SUBSCRIPTION_DURATION_DAYS,
      is_free: false,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_invoice_id: invoiceId || undefined,
    });
  }

  // 5. Create shipment
  if (!(await orderHasShipment(orderId))) {
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
  }

  // 6. Create the portal account immediately (or reuse an existing one) and
  // email the customer their login credentials directly — no separate
  // "click to activate" step.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://starlinkee.com";
  const loginUrl = `${appUrl}/portal/login`;
  const customer = await getCustomerById(customerId);
  const language = customer?.preferred_language ?? countryLanguage;

  const generatedPassword = generateRandomPassword();
  const accountResult = await createConfirmedPortalUser(email, generatedPassword);
  const portalPassword: string | null = accountResult === "created" ? generatedPassword : null;

  await sendPortalCredentials(email, language, {
    customerName: invoice.customer_name ?? email,
    loginUrl,
    password: portalPassword,
  }).catch((err) => console.error("[stripe] credentials email failed:", err));

  // 7. Notify admin (non-blocking — failure must not abort the webhook)
  await sendOrderConfirmationToAdmin({
    orderId,
    customerName: invoice.customer_name ?? email,
    customerEmail: email,
    plateCount: totalPlates,
  }).catch((err) => console.error("[stripe] admin email failed:", err));
}
