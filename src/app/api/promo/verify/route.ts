import { NextRequest, NextResponse } from "next/server";
import { getLeadByCouponCode } from "@/lib/db/leads";
import { getLocationById } from "@/lib/db/locations";

export async function POST(request: NextRequest) {
  const { code } = await request.json();

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const lead = await getLeadByCouponCode(code.toUpperCase());
  if (!lead) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  const location = await getLocationById(lead.location_id);

  return NextResponse.json({
    valid: true,
    locationName: location?.location_name ?? "",
    promoText: location?.promo_banner_text ?? "",
    isUsed: lead.is_used,
    usedAt: lead.used_at,
  });
}
