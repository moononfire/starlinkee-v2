import { NextResponse } from "next/server";
import { getLoyaltySession } from "@/lib/session";
import { getLoyaltyCard, resetLoyaltyCard } from "@/lib/db/loyalty";
import { getLocationById } from "@/lib/db/locations";

export async function POST() {
  const session = await getLoyaltySession();
  if (!session.phone || !session.locationId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { phone, locationId } = session;

  const location = await getLocationById(locationId);
  const maxStamps = location?.loyalty_stamps_required ?? 10;

  const card = await getLoyaltyCard(locationId, phone);
  if (!card || card.stamps_count < maxStamps) {
    return NextResponse.json({ error: "No reward available" }, { status: 400 });
  }

  await resetLoyaltyCard(card.id);

  return NextResponse.json({ ok: true, stamps: 0 });
}
