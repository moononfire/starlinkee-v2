import { getLoyaltyCard, createLoyaltyCard, incrementStamp, setRedeemCode } from "./db/loyalty";
import { getLocationById } from "./db/locations";
import { validateScanToken } from "./db/scan-tokens";
import { generateCouponCode } from "./db/leads";

// Matches location_leads' CLAIM_WINDOW_MS — staff has 15 minutes to confirm
// the code at /verify before it lapses and the card becomes claimable again.
export const REDEEM_WINDOW_MS = 15 * 60 * 1000;

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

export type ClaimRewardResult =
  | { ok: true; code: string; expiresAt: string }
  | { ok: false; status: 400; error: string };

// Generates a staff-verified redeem code instead of clearing stamps
// directly — the card only resets once a staff member confirms the code at
// /verify (confirmRedemption), so an abandoned or expired code never costs
// the customer their stamps.
export async function claimLoyaltyReward(locationId: number, phone: string): Promise<ClaimRewardResult> {
  const location = await getLocationById(locationId);
  const maxStamps = location?.loyalty_stamps_required ?? 10;

  const card = await getLoyaltyCard(locationId, phone);
  if (!card || card.stamps_count < maxStamps) {
    return { ok: false, status: 400, error: "No reward available" };
  }

  if (card.redeem_code && card.redeem_requested_at && !card.redeem_used_at) {
    const elapsed = Date.now() - new Date(card.redeem_requested_at).getTime();
    if (elapsed < REDEEM_WINDOW_MS) {
      return {
        ok: true,
        code: card.redeem_code,
        expiresAt: new Date(new Date(card.redeem_requested_at).getTime() + REDEEM_WINDOW_MS).toISOString(),
      };
    }
  }

  const code = generateCouponCode();
  const requestedAt = new Date();
  await setRedeemCode(card.id, code, requestedAt.toISOString());

  return { ok: true, code, expiresAt: new Date(requestedAt.getTime() + REDEEM_WINDOW_MS).toISOString() };
}
