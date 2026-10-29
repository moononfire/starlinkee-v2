import { ownerLanguage } from "@/lib/languages";
import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-session";
import { getPlatesBySubscriptionId } from "@/lib/db/plates";
import { createRenewalCheckoutSession } from "@/lib/services/stripe";

// Only a lapsed ("inactive") subscription can be renewed here, so a direct POST cannot touch paid time.
// Renewal is for the venue owner only: it needs a confirmed portal session whose customer owns the
// subscription. The plate URL (and its secret) is printed on the plate and reachable by any guest.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { user, customer, subscriptions } = await getPortalSession();
  if (!user || !customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const subscriptionId = Number(form.get("subscriptionId"));
  const interval = form.get("interval") === "year" ? "year" : "month";
  if (!subscriptionId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const subscription = subscriptions.find((s) => s.subscription_id === subscriptionId);
  if (!subscription || subscription.status !== "inactive") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const plates = await getPlatesBySubscriptionId(subscriptionId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const checkoutUrl = await createRenewalCheckoutSession({
      subscriptionId,
      plateNumber: plates[0]?.plate_number ?? "",
      returnUrl: `${appUrl}/portal/${subscriptionId}`,
      lang: ownerLanguage(customer, plates[0]),
      interval,
    });
    return NextResponse.redirect(checkoutUrl, 303);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Checkout failed";
    console.error("[plate renew]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
