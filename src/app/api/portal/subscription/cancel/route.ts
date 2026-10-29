import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-session";
import { cancelRenewalAtPeriodEnd } from "@/lib/services/stripe-cancel";

// Owner-only, like renewal: needs a confirmed portal session whose customer owns the subscription.
// Only switches the renewal off (the paid period keeps running), so it cannot cut access or refund anything.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { user, customer, subscriptions } = await getPortalSession();
  if (!user || !customer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await request.json().catch(() => null);
  const subscriptionId = Number(parsed?.subscriptionId);
  const subscription = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!subscription) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!subscription.stripe_subscription_id || subscription.status !== "active") {
    return NextResponse.json({ error: "Nothing to cancel" }, { status: 400 });
  }
  if (subscription.cancel_at_period_end) return NextResponse.json({ cancelAtPeriodEnd: true });

  try {
    await cancelRenewalAtPeriodEnd(subscription.stripe_subscription_id);
  } catch (err) {
    console.error(`[cancel renewal] subscription ${subscriptionId}:`, err);
    return NextResponse.json({ error: "Could not cancel the renewal" }, { status: 502 });
  }
  return NextResponse.json({ cancelAtPeriodEnd: true });
}
