import { NextRequest, NextResponse } from "next/server";
import { getLoyaltySession } from "@/lib/session";
import { getLoyaltyCard, createLoyaltyCard, incrementStamp } from "@/lib/db/loyalty";
import { getLocationById } from "@/lib/db/locations";
import { validateScanToken } from "@/lib/db/scan-tokens";

const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12h

export async function POST(request: NextRequest) {
  const session = await getLoyaltySession();
  if (!session.phone || !session.locationId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { phone, locationId } = session;

  // Require proof of a real, recent NFC tap — otherwise the loyalty link
  // could be reused remotely without ever visiting the location.
  const { scanToken } = await request.json().catch(() => ({ scanToken: undefined }));
  const scanResult = scanToken ? await validateScanToken(scanToken) : { valid: false as const };
  if (!scanResult.valid || scanResult.locationId !== locationId) {
    return NextResponse.json({ error: "scan_required" }, { status: 403 });
  }

  const location = await getLocationById(locationId);
  const maxStamps = location?.loyalty_stamps_required ?? 10;

  let card = await getLoyaltyCard(locationId, phone);

  if (!card) {
    card = await createLoyaltyCard(locationId, phone);
    return NextResponse.json({
      stamps: card.stamps_count,
      reward_ready: card.stamps_count >= maxStamps,
    });
  }

  if (card.stamps_count >= maxStamps) {
    return NextResponse.json({ stamps: card.stamps_count, reward_ready: true });
  }

  if (card.last_stamp_at) {
    const elapsed = Date.now() - new Date(card.last_stamp_at).getTime();
    if (elapsed < COOLDOWN_MS) {
      const remaining_seconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return NextResponse.json({ error: "cooldown", remaining_seconds }, { status: 429 });
    }
  }

  const updated = await incrementStamp(card.id);
  const reward_ready = updated.stamps_count >= maxStamps;

  return NextResponse.json({ stamps: updated.stamps_count, reward_ready });
}
