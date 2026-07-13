import { randomInt } from "crypto";
import { timingSafeEqual } from "crypto";
import { getLocationBySlug } from "./db/locations";
import { upsertOtp, getOtp, deleteOtp, getLoyaltyCard } from "./db/loyalty";
import { sendSms } from "./sms";
import { rateLimit } from "./rate-limit";
import { normalizePhone } from "./phone";

const PHONE_PATTERN = /^\+?[0-9 ()-]{6,20}$/;

export type LoyaltyAuthResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export async function requestLoyaltyOtp(
  rawPhone: unknown,
  slug: unknown,
  ip: string
): Promise<LoyaltyAuthResult<{ phone: string }>> {
  if (!rawPhone || !slug) {
    return { ok: false, status: 400, error: "Missing phone or slug" };
  }
  if (typeof rawPhone !== "string" || !PHONE_PATTERN.test(rawPhone)) {
    return { ok: false, status: 400, error: "Invalid phone number" };
  }

  const phone = normalizePhone(rawPhone);

  // Each request sends a paid SMS — throttle per phone and per IP.
  if (
    !rateLimit(`otp-req-phone:${phone}`, 3, 15 * 60_000) ||
    !rateLimit(`otp-req-ip:${ip}`, 10, 15 * 60_000)
  ) {
    return { ok: false, status: 429, error: "Too many requests" };
  }

  const location = await getLocationBySlug(String(slug));
  if (!location || !location.has_loyalty_enabled) {
    return { ok: false, status: 404, error: "Location not found" };
  }

  const code = String(randomInt(1000, 10000));
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

  try {
    await upsertOtp(location.location_id, phone, code, expiresAt);
    await sendSms(phone, `Twój kod weryfikacyjny: ${code}`);
  } catch (err) {
    console.error("Failed to send OTP", err);
    return { ok: false, status: 500, error: "Failed to send OTP" };
  }

  return { ok: true, data: { phone } };
}

export async function verifyLoyaltyOtp(
  rawPhone: unknown,
  code: unknown,
  slug: unknown,
  ip: string
): Promise<
  LoyaltyAuthResult<{ phone: string; locationId: number; stamps: number; rewardReady: boolean }>
> {
  if (!rawPhone || !code || !slug) {
    return { ok: false, status: 400, error: "Missing fields" };
  }

  const phone = normalizePhone(String(rawPhone));

  // A 4-digit code is brute-forceable — cap verification attempts.
  if (
    !rateLimit(`otp-verify-phone:${phone}`, 5, 10 * 60_000) ||
    !rateLimit(`otp-verify-ip:${ip}`, 20, 10 * 60_000)
  ) {
    return { ok: false, status: 429, error: "Too many attempts" };
  }

  const location = await getLocationBySlug(String(slug));
  if (!location || !location.has_loyalty_enabled) {
    return { ok: false, status: 404, error: "Location not found" };
  }

  const otp = await getOtp(location.location_id, phone);
  if (!otp) {
    return { ok: false, status: 401, error: "Invalid or expired code" };
  }

  if (new Date(otp.expires_at) < new Date()) {
    return { ok: false, status: 401, error: "Code expired" };
  }

  const storedBuf = Buffer.from(otp.otp_code);
  const submittedBuf = Buffer.from(String(code).padEnd(storedBuf.length));
  const match =
    storedBuf.length === submittedBuf.length && timingSafeEqual(storedBuf, submittedBuf);

  if (!match) {
    return { ok: false, status: 401, error: "Invalid or expired code" };
  }

  await deleteOtp(location.location_id, phone);

  const maxStamps = location.loyalty_stamps_required ?? 10;
  const card = await getLoyaltyCard(location.location_id, phone);
  const stamps = card?.stamps_count ?? 0;

  return {
    ok: true,
    data: { phone, locationId: location.location_id, stamps, rewardReady: stamps >= maxStamps },
  };
}
