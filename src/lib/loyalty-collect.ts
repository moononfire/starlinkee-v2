import { getLoyaltyCard, createLoyaltyCard, incrementStamp, resetLoyaltyCard } from "./db/loyalty";
import { getLocationById } from "./db/locations";
import { validateScanToken } from "./db/scan-tokens";

const COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12h

export type CollectStampResult =
  | { ok: true; stamps: number; rewardReady: boolean }
  | { ok: false; status: 403; error: "scan_required" }
  | { ok: false; status: 429; error: "cooldown"; remainingSeconds: number };

export async function collectLoyaltyStamp(
  locationId: number,
  phone: string,
  scanToken: unknown
): Promise<CollectStampResult> {
  // Require proof of a real, recent NFC tap — otherwise the loyalty link
  // could be reused remotely without ever visiting the location.
  const scanResult = scanToken ? await validateScanToken(String(scanToken)) : { valid: false as const };
  if (!scanResult.valid || scanResult.locationId !== locationId) {
    return { ok: false, status: 403, error: "scan_required" };
  }

  const location = await getLocationById(locationId);
  const maxStamps = location?.loyalty_stamps_required ?? 10;

  let card = await getLoyaltyCard(locationId, phone);

  if (!card) {
    card = await createLoyaltyCard(locationId, phone);
    return { ok: true, stamps: card.stamps_count, rewardReady: card.stamps_count >= maxStamps };
  }

  if (card.stamps_count >= maxStamps) {
    return { ok: true, stamps: card.stamps_count, rewardReady: true };
  }

  if (card.last_stamp_at) {
    const elapsed = Date.now() - new Date(card.last_stamp_at).getTime();
    if (elapsed < COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      return { ok: false, status: 429, error: "cooldown", remainingSeconds };
    }
  }

  const updated = await incrementStamp(card.id);
  const rewardReady = updated.stamps_count >= maxStamps;

  return { ok: true, stamps: updated.stamps_count, rewardReady };
}

export type ClaimRewardResult = { ok: true; stamps: number } | { ok: false; status: 400; error: string };

export async function claimLoyaltyReward(locationId: number, phone: string): Promise<ClaimRewardResult> {
  const location = await getLocationById(locationId);
  const maxStamps = location?.loyalty_stamps_required ?? 10;

  const card = await getLoyaltyCard(locationId, phone);
  if (!card || card.stamps_count < maxStamps) {
    return { ok: false, status: 400, error: "No reward available" };
  }

  await resetLoyaltyCard(card.id);

  return { ok: true, stamps: 0 };
}
