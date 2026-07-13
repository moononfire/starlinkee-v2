import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifyMobileToken } from "@/lib/mobile-session";
import { getLoyaltyCardsForPhone } from "@/lib/db/loyalty";

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  const session = token ? await verifyMobileToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const cards = await getLoyaltyCardsForPhone(session.phone);

  return NextResponse.json({
    phone: session.phone,
    cards: cards.map((c) => ({
      slug: c.linktree_slug,
      location_name: c.location_name,
      logo_link: c.logo_link,
      stamps: c.stamps_count,
      max_stamps: c.max_stamps,
      reward_ready: c.stamps_count >= c.max_stamps,
      last_stamp_at: c.last_stamp_at,
    })),
  });
}
