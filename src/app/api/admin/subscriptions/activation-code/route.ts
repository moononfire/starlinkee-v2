import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { issueActivationCode } from "@/lib/services/activation";

/**
 * (Re)issue the plate activation code for a pending subscription and email it
 * to the customer. Replaces any earlier code. Used for subscriptions created
 * before activation codes existed, or when the original email got lost.
 */
export async function POST(req: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { subscription_id } = await req.json().catch(() => ({}));
  const id = Number(subscription_id);
  if (!id) {
    return NextResponse.json({ error: "subscription_id required" }, { status: 400 });
  }

  const sent = await issueActivationCode(id);
  if (!sent) {
    return NextResponse.json(
      { error: "Could not issue code (subscription not pending, no customer email, or email failed)" },
      { status: 422 }
    );
  }
  return NextResponse.json({ ok: true });
}
