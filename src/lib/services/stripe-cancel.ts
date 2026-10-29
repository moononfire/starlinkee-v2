import Stripe from "stripe";
import { setCancelAtPeriodEnd } from "../db/subscriptions";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

/**
 * Switches the renewal of a Stripe subscription off: it stays paid and active until the end of the current
 * period, then Stripe stops charging. Nothing is refunded and no access is cut early.
 */
export async function cancelRenewalAtPeriodEnd(stripeSubscriptionId: string): Promise<void> {
  await getStripe().subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });
  // The webhook would set it too; writing it now makes the portal right on the very next load.
  await setCancelAtPeriodEnd(stripeSubscriptionId, true);
}

/**
 * customer.subscription.updated / .deleted: keep our flag equal to Stripe's. A deleted subscription is over,
 * so it counts as "will not renew" too. Idempotent, so redelivery and out-of-order events do no harm.
 */
export async function processStripeSubscriptionEvent(event: Stripe.Event): Promise<void> {
  if (event.type !== "customer.subscription.updated" && event.type !== "customer.subscription.deleted") return;
  const sub = event.data.object as Stripe.Subscription;
  const ending =
    event.type === "customer.subscription.deleted" || sub.cancel_at_period_end || typeof sub.cancel_at === "number";
  await setCancelAtPeriodEnd(sub.id, ending);
}
