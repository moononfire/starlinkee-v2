import { NextRequest, NextResponse } from "next/server";
import { getPlateByNumber } from "@/lib/db/plates";
import { createRenewalCheckoutSession } from "@/lib/services/stripe";

export async function POST(request: NextRequest) {
  const form = await request.formData();

  const plateNumber = form.get("plateNumber") as string;
  const plateSecret = form.get("plateSecret") as string;

  if (!plateNumber || !plateSecret) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Re-verify plate and secret
  const plate = await getPlateByNumber(plateNumber);
  if (!plate || plateSecret !== plate.secret_key) {
    return NextResponse.json({ error: "Invalid plate" }, { status: 403 });
  }

  try {
    const checkoutUrl = await createRenewalCheckoutSession({
      plateId: plate.plate_id,
      subscriptionId: plate.subscription_id,
      plateNumber: plate.plate_number,
      plateSecret: plate.secret_key,
      lang: plate.plate_language,
    });
    return NextResponse.redirect(checkoutUrl, 303);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Checkout failed";
    console.error("[plate renew]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
