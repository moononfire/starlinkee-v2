import { NextResponse } from "next/server";
import { getLoyaltySession } from "@/lib/session";
import { getLoyaltyCard, resetLoyaltyCard } from "@/lib/db/loyalty";

export async function POST() {
  const session = await getLoyaltySession();
  if (!session.phone || !session.locationId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { phone, locationId } = session;

  const card = await getLoyaltyCard(locationId, phone);
  if (!card || card.stamps_count < 10) {
    return NextResponse.json({ error: "No reward available" }, { status: 400 });
  }

  await resetLoyaltyCard(card.id);

  return NextResponse.json({ ok: true, stamps: 0 });
}
