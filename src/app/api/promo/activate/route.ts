import { NextRequest, NextResponse } from "next/server";
import { getLeadByToken, getLeadByCouponCode, markLeadAsUsed, CLAIM_WINDOW_MS } from "@/lib/db/leads";
import { getLoyaltyCardByRedeemCode, confirmRedemption } from "@/lib/db/loyalty";
import { REDEEM_WINDOW_MS } from "@/lib/loyalty-collect";

function isExpired(requestedAt: string | null, windowMs: number): boolean {
  return !!requestedAt && Date.now() - new Date(requestedAt).getTime() > windowMs;
}

export async function POST(request: NextRequest) {
  const { token, code } = await request.json();

  if (!token && !code) {
    return NextResponse.json({ error: "Missing token or code" }, { status: 400 });
  }

  const normalizedCode = code ? code.toUpperCase() : null;

  const lead = normalizedCode
    ? await getLeadByCouponCode(normalizedCode)
    : await getLeadByToken(token);

  if (lead) {
    if (lead.is_used) {
      return NextResponse.json({ error: "Already used" }, { status: 409 });
    }
    if (isExpired(lead.claimed_at, CLAIM_WINDOW_MS)) {
      return NextResponse.json({ error: "Expired" }, { status: 410 });
    }
    await markLeadAsUsed(lead.id);
    return NextResponse.json({ ok: true });
  }

  // Staff scans/enters a code, not a token — a token only ever applies to
  // promo leads, so loyalty codes are only looked up here.
  if (normalizedCode) {
    const card = await getLoyaltyCardByRedeemCode(normalizedCode);
    if (card) {
      if (card.redeem_used_at) {
        return NextResponse.json({ error: "Already used" }, { status: 409 });
      }
      if (isExpired(card.redeem_requested_at, REDEEM_WINDOW_MS)) {
        return NextResponse.json({ error: "Expired" }, { status: 410 });
      }
      await confirmRedemption(card.id);
      return NextResponse.json({ ok: true });
    }
  }

  return NextResponse.json({ error: "Invalid" }, { status: 404 });
}
