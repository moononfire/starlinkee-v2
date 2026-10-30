import { ownerLanguage, SUPPORTED_LANGUAGES, type Language } from "@/lib/languages";
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
  extendSubscription,
  setSubscriptionStripeId,
  getSubscriptionById,
  listSubscriptionsByStripeInvoice,
  listSubscriptionsByStripeSubscription,
} from "../db/subscriptions";
import {
  sendOrderConfirmationToAdmin,
  sendPortalCredentials,
  sendRenewalConfirmation,
  sendRenewalConfirmationToAdmin,
  sendDuplicateStripeSubscriptionToAdmin,
  sendInvalidCartMetadataToAdmin,
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

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

function getPriceId(price: string | Stripe.Price | null | undefined): string | undefined {
  if (!price) return undefined;
  return typeof price === "string" ? price : price.id;
}

// Extra days of access after the paid period ends, so a late or retried payment does not switch the plate off.
export const RENEWAL_GRACE_DAYS = 2;
const DAY_MS = 86_400_000;

const RENEWAL_DURATION_DAYS: Record<"month" | "year", number> = {
  month: 30,
  year: 365,
};

/**
 * Plates on an invoice: subscription lines (monthly, yearly, or the older yearly price) plus extra-plate lines.
 * The subscription line decides how long each row lasts; extra plates alone are not a valid cart, so they give 0.
 * Price ids come from env (same names as www); an unset name matches nothing.
 */
function countCartPlates(invoice: Stripe.Invoice): { totalPlates: number; durationDays: number } {
  const monthly = process.env.STRIPE_PRICE_ID_SUBSCRIPTION;
  const yearlyIds = [process.env.STRIPE_PRICE_ID_SUBSCRIPTION_YEARLY, process.env.STRIPE_PRICE_ID_1_YEAR_SUB];
  const extra = process.env.STRIPE_PRICE_ID_EXTRA_PLATE;

  let subscriptionPlates = 0;
  let extraPlates = 0;
  let durationDays: number | undefined;
  for (const line of invoice.lines.data) {
    // In Stripe SDK v22, price is under line.pricing.price_details.price
    const linePriceId = getPriceId(line.pricing?.price_details?.price);
    if (!linePriceId) continue;
    const quantity = line.quantity ?? 1;
    if (linePriceId === monthly) {
      subscriptionPlates += quantity;
      durationDays ??= RENEWAL_DURATION_DAYS.month;
    } else if (yearlyIds.includes(linePriceId)) {
      subscriptionPlates += quantity;
      durationDays ??= RENEWAL_DURATION_DAYS.year;
    } else if (linePriceId === extra) {
      extraPlates += quantity;
    }
  }

  if (subscriptionPlates === 0) {
    if (extraPlates > 0) console.error(`[stripe] invoice ${invoice.id} has extra plates but no subscription line, creating nothing`);
    return { totalPlates: 0, durationDays: RENEWAL_DURATION_DAYS.year };
  }
  return { totalPlates: subscriptionPlates + extraPlates, durationDays: durationDays ?? RENEWAL_DURATION_DAYS.year };
}

/**
 * Expires this row's earlier open renewal Checkout sessions (e.g. the month tab while the year tab is opened),
 * so one subscription cannot end up with two paid Stripe subscriptions. Best effort: never blocks a new renewal.
 */
async function expireOpenRenewalSessions(subscriptionId: number): Promise<void> {
  try {
    const stripe = getStripe();
    const open = await stripe.checkout.sessions.list({ status: "open", limit: 100 });
    for (const session of open.data) {
      if (session.metadata?.renewal_subscription_id === String(subscriptionId)) {
        await stripe.checkout.sessions.expire(session.id);
      }
    }
  } catch (err) {
    console.error(`[stripe] could not expire earlier renewal sessions for subscription ${subscriptionId}:`, err);
  }
}

async function isStripeSubscriptionLive(stripeSubscriptionId: string): Promise<boolean> {
  try {
    const sub = await getStripe().subscriptions.retrieve(stripeSubscriptionId);
    return ["active", "trialing", "past_due", "unpaid"].includes(sub.status);
  } catch (err) {
    // Cannot tell: better one unneeded alert than a silent double charge.
    console.error(`[stripe] could not look up Stripe subscription ${stripeSubscriptionId}:`, err);
    return true;
  }
}

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

  await expireOpenRenewalSessions(subscriptionId);

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    metadata: { renewal_subscription_id: String(subscriptionId) },
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

type MetadataCart =
  | { status: "none" }
  | { status: "ok"; totalPlates: number; durationDays: number }
  | { status: "invalid"; errors: string[] };

/**
 * The www checkout describes the cart in subscription metadata: `billing` (monthly | annual | trial), `total_plates`
 * and, for a trial, `trial_days`. Without `billing` there is nothing to read (price ids decide, see countCartPlates).
 * With it, anything unusable is reported instead of guessed: the metadata and the invoice would disagree.
 * `kind`, `plates` and `plates_by_language` are deliberately ignored (a trial has kind=subscription_yearly).
 */
function cartFromMetadata(metadata: Stripe.Metadata | null | undefined): MetadataCart {
  const billing = metadata?.billing?.trim().toLowerCase();
  if (!billing) return { status: "none" };

  const errors: string[] = [];
  let durationDays = 0;
  if (billing === "monthly") durationDays = RENEWAL_DURATION_DAYS.month;
  else if (billing === "annual") durationDays = RENEWAL_DURATION_DAYS.year;
  else if (billing === "trial") {
    const trialDays = parseCount(metadata?.trial_days, 3650);
    if (trialDays === null) errors.push("trial_days");
    else durationDays = trialDays;
  } else {
    errors.push("billing");
  }

  const totalPlates = parseCount(metadata?.total_plates, MAX_CART_PLATES);
  if (totalPlates === null) errors.push("total_plates");

  if (errors.length > 0 || totalPlates === null) return { status: "invalid", errors };
  return { status: "ok", totalPlates, durationDays };
}

const MAX_CART_PLATES = 50;

/** A whole number from 1 to max written as plain digits, else null. */
function parseCount(value: string | undefined, max: number): number | null {
  if (!value || !/^\d+$/.test(value.trim())) return null;
  const n = Number(value.trim());
  return n >= 1 && n <= max ? n : null;
}

/** A supported language from Stripe metadata `locale`, or undefined (anything else is ignored). */
function localeFrom(metadata: Stripe.Metadata | null | undefined): Language | undefined {
  const value = metadata?.locale?.trim().toLowerCase();
  return SUPPORTED_LANGUAGES.find((l) => l === value);
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
    // Like the renewal path: the next cycle's invoice only exists after the paid period ends, so keep a grace window.
    const expiration = new Date((until ?? new Date(now.getTime() + sub.duration_in_days * DAY_MS)).getTime() + RENEWAL_GRACE_DAYS * DAY_MS);
    await extendOnCycle(sub, expiration);
  }
}

/** Moves the end date for a later billing cycle: keeps activation_datetime and never shortens granted time. */
async function extendOnCycle(sub: Subscription, expiration: Date): Promise<void> {
  const granted = sub.expiration_datetime ? new Date(sub.expiration_datetime) : null;
  const until = granted && granted > expiration ? granted : expiration;
  await extendSubscription(sub.subscription_id, until.toISOString());
}

/**
 * Remembers which Stripe subscription pays for this row. If the row already had a different one that is still
 * live, the customer is now paying twice: tell the admin (no automatic cancellation).
 */
async function recordStripeSubscription(
  current: Subscription | null,
  stripeSubscriptionId: string,
  context: { plateNumber: string; customerEmail: string }
): Promise<void> {
  if (!current) return;
  const previous = current.stripe_subscription_id;
  if (previous === stripeSubscriptionId) return;

  await setSubscriptionStripeId(current.subscription_id, stripeSubscriptionId);
  if (previous && (await isStripeSubscriptionLive(previous))) {
    console.error(
      `[stripe] subscription ${current.subscription_id} now has two live Stripe subscriptions: ${previous} and ${stripeSubscriptionId}`
    );
    await sendDuplicateStripeSubscriptionToAdmin({
      subscriptionId: current.subscription_id,
      previousStripeSubscriptionId: previous,
      newStripeSubscriptionId: stripeSubscriptionId,
      ...context,
    }).catch((err) => console.error("[stripe] duplicate-subscription admin email failed:", err));
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
  // Access runs to the end of the period Stripe billed (not "now + N days": Stripe bills calendar months),
  // plus the grace days for late or retried payments.
  const paidUntil = paidThrough(invoice) ?? new Date(now.getTime() + durationDays * DAY_MS);
  const expiration = new Date(paidUntil.getTime() + RENEWAL_GRACE_DAYS * DAY_MS);

  const plateNumber = metadata.plate_number ?? "";
  const interval = metadata.renewal_interval === "year" ? "year" : "month";
  const email = invoice.customer_email;
  const stripeSubscriptionId = stripeSubscriptionIdOf(invoice);

  const existingSubscriptionId = Number(metadata.renewal_subscription_id);
  if (existingSubscriptionId) {
    const current = await getSubscriptionById(existingSubscriptionId);

    if (phase === "cycle") {
      // A later billing cycle of an already renewed subscription: move the end date, nothing else.
      // No "renewed" emails and activation_datetime stays; never shorten what is already granted.
      if (!current) {
        console.error(`[stripe] renewal cycle invoice ${invoice.id}: subscription ${existingSubscriptionId} not found`);
        return;
      }
      if (current.status === "pending") return;
      await extendOnCycle(current, expiration);
      return;
    }

    await setSubscriptionActive(existingSubscriptionId, now.toISOString(), expiration.toISOString());

    if (stripeSubscriptionId) {
      await recordStripeSubscription(current, stripeSubscriptionId, { plateNumber, customerEmail: email ?? "unknown" });
    }

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
    if (target.status !== "pending") await extendOnCycle(target, expiration);
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
    const assigned = await assignPlateToSubscription(plateId, subscription.subscription_id);
    // Paid, but the plate is gone or belongs to someone else: fail loudly (the event is recorded as failed)
    // rather than leave a paying customer with a subscription that has no plate.
    if (!assigned) {
      throw new Error(`renewal invoice ${invoice.id}: plate ${plateId} could not be assigned to subscription ${subscription.subscription_id}`);
    }
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

  // The www checkout stores the visitor's language as `locale` metadata on the Checkout subscription (copied to the
  // invoice) and on the Stripe customer. The billing country says nothing about the language, so it is not used.
  const subscriptionMetadata = invoice.parent?.subscription_details?.metadata;
  let locale = localeFrom(subscriptionMetadata);
  let customerMetadata: Stripe.Metadata | null | undefined;
  let companyName: string | undefined;
  if (hasTaxId || !locale || !subscriptionMetadata?.billing) {
    const stripeCustomerId = typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
    if (stripeCustomerId) {
      const stripeCustomer = await getStripe().customers.retrieve(stripeCustomerId);
      if (!stripeCustomer.deleted) {
        if (hasTaxId) companyName = stripeCustomer.business_name ?? undefined;
        customerMetadata = stripeCustomer.metadata;
        locale ??= localeFrom(stripeCustomer.metadata);
      }
    }
  }

  // The cart metadata (subscription first, else the Stripe customer) is checked before anything is written:
  // a paid invoice we cannot read creates nothing and alerts the admin instead of selling the wrong thing.
  const metadataCart = cartFromMetadata(subscriptionMetadata?.billing ? subscriptionMetadata : customerMetadata);
  if (metadataCart.status === "invalid") {
    const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : (invoice.customer?.id ?? "unknown");
    console.error(
      `[stripe] invoice ${invoice.id} has invalid cart metadata (${metadataCart.errors.join(", ")}) — nothing created, admin alerted`
    );
    await sendInvalidCartMetadataToAdmin({
      invoiceId: invoice.id ?? "unknown",
      stripeCustomerId,
      customerEmail: email,
      amount: `${((invoice.amount_paid ?? 0) / 100).toFixed(2)} ${(invoice.currency ?? "").toUpperCase()}`.trim(),
      errors: metadataCart.errors,
    }).catch((err) => console.error("[stripe] invalid-cart admin email failed:", err));
    return;
  }

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
    preferred_language: locale,
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
  // Cart metadata decides when present; otherwise the www cart is one subscription line (monthly or yearly) plus
  // extra plates. Every plate becomes its own row.
  const { totalPlates, durationDays } = metadataCart.status === "ok" ? metadataCart : countCartPlates(invoice);

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
      duration_in_days: durationDays,
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
  const language = customer?.preferred_language ? ownerLanguage(customer) : (locale ?? "en");

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
