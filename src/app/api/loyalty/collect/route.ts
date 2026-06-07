import { NextResponse } from "next/server";
import { getLoyaltySession } from "@/lib/session";
import { getLoyaltyCard, createLoyaltyCard, incrementStamp } from "@/lib/db/loyalty";

const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12h
const MAX_STAMPS = 10;

export async function POST() {
  const session = await getLoyaltySession();
  if (!session.phone || !session.locationId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { phone, locationId } = session;

  let card = await getLoyaltyCard(locationId, phone);

  if (!card) {
    card = await createLoyaltyCard(locationId, phone);
    return NextResponse.json({ stamps: card.stamps_count, reward_ready: false });
  }

  if (card.stamps_count >= MAX_STAMPS) {
    return NextResponse.json({ stamps: MAX_STAMPS, reward_ready: true });
  }

  if (card.last_stamp_at) {
    const elapsed = Date.now() - new Date(card.last_stamp_at).getTime();
    if (elapsed < COOLDOWN_MS) {
      const remaining_seconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json({ error: "cooldown", remaining_seconds }, { status: 429 });
    }
  }

  const updated = await incrementStamp(card.id);
  const reward_ready = updated.stamps_count >= MAX_STAMPS;

  return NextResponse.json({ stamps: updated.stamps_count, reward_ready });
}
