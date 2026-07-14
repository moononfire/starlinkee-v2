import { NextRequest, NextResponse } from "next/server";
import { getLeadByCouponCode, CLAIM_WINDOW_MS } from "@/lib/db/leads";
import { getLoyaltyCardByRedeemCode } from "@/lib/db/loyalty";
import { REDEEM_WINDOW_MS } from "@/lib/loyalty-collect";
import { getLocationById } from "@/lib/db/locations";

function expiryInfo(requestedAt: string | null, windowMs: number) {
  if (!requestedAt) return { expired: false, expiresAt: null as string | null };
  const requestedAtMs = new Date(requestedAt).getTime();
  return {
    expired: Date.now() - requestedAtMs > windowMs,
    expiresAt: new Date(requestedAtMs + windowMs).toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const { code } = await request.json();

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const normalizedCode = code.toUpperCase();

  const lead = await getLeadByCouponCode(normalizedCode);
  if (lead) {
    const location = await getLocationById(lead.location_id);
    const { expired, expiresAt } = expiryInfo(lead.claimed_at, CLAIM_WINDOW_MS);

    return NextResponse.json({
      valid: true,
      kind: "promo",
      locationName: location?.location_name ?? "",
      logoLink: location?.logo_link ?? null,
      promoText: location?.promo_banner_text ?? "",
      isUsed: lead.is_used,
      usedAt: lead.used_at,
      expired: !lead.is_used && expired,
      expiresAt,
    });
  }

  const card = await getLoyaltyCardByRedeemCode(normalizedCode);
  if (card) {
    const location = await getLocationById(card.location_id);
    const { expired, expiresAt } = expiryInfo(card.redeem_requested_at, REDEEM_WINDOW_MS);

    return NextResponse.json({
      valid: true,
      kind: "loyalty",
      locationName: location?.location_name ?? "",
      logoLink: location?.logo_link ?? null,
      promoText: "",
      isUsed: !!card.redeem_used_at,
      usedAt: card.redeem_used_at,
      expired: !card.redeem_used_at && expired,
      expiresAt,
    });
  }

  return NextResponse.json({ valid: false }, { status: 404 });
}
