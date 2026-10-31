import { randomInt } from "crypto";
import { timingSafeEqual } from "crypto";
import { upsertOtp, getOtp, deleteOtp, registerOtpAttempt } from "./db/loyalty";
import { sendSms } from "./sms";
import { rateLimitPersistent } from "./rate-limit-persistent";
import { normalizePhone } from "./phone";
import { guestLanguage, SUPPORTED_LANGUAGES, type Language } from "./languages";
import { t } from "./translations";

const MAX_OTP_ATTEMPTS = 5;
const PHONE_PATTERN = /^\+?[0-9 ()-]{6,20}$/;

export type LoyaltyAuthResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

// Phone verification is app-wide, not tied to any one location — it's the
// single login for the mobile app (after Google Sign-In), and the resulting
// session then works across every location's loyalty card.
const PHONE_PREFIX_LANGUAGES: Array<[string, Language]> = [
  ["+48", "pl"],
  ["+49", "de"],
  ["+43", "de"],
  ["+41", "de"],
  ["+39", "it"],
];

/**
 * The SMS goes to a guest, so it speaks the guest's language. The app's own `lang` wins; the app does not send it
 * yet, so otherwise the first supported Accept-Language tag, then the country prefix of the number, then English.
 */
function otpLanguage(lang: unknown, acceptLanguage: string | null | undefined, phone: string): Language {
  if (typeof lang === "string" && SUPPORTED_LANGUAGES.includes(lang as Language)) return lang as Language;
  for (const part of (acceptLanguage ?? "").split(",")) {
    const code = part.split(";")[0].trim().toLowerCase().split("-")[0];
    if (SUPPORTED_LANGUAGES.includes(code as Language)) return code as Language;
  }
  const byPrefix = PHONE_PREFIX_LANGUAGES.find(([prefix]) => phone.startsWith(prefix));
  return guestLanguage(byPrefix?.[1]);
}

export async function requestLoyaltyOtp(
  rawPhone: unknown,
  ip: string,
  lang?: unknown,
  acceptLanguage?: string | null
): Promise<LoyaltyAuthResult<{ phone: string }>> {
  if (!rawPhone) {
    return { ok: false, status: 400, error: "Missing phone" };
  }
  if (typeof rawPhone !== "string" || !PHONE_PATTERN.test(rawPhone)) {
    return { ok: false, status: 400, error: "Invalid phone number" };
  }

  const phone = normalizePhone(rawPhone);

  // Each request sends a paid SMS — throttle per phone and per IP.
  if (
    !(await rateLimitPersistent(`otp-req-phone:${phone}`, 3, 15 * 60_000)) ||
    !(await rateLimitPersistent(`otp-req-ip:${ip}`, 10, 15 * 60_000))
  ) {
    return { ok: false, status: 429, error: "Too many requests" };
  }

  const code = String(randomInt(1000, 10000));
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

  try {
    await upsertOtp(phone, code, expiresAt);
    await sendSms(phone, t("loyalty_otp_sms", otpLanguage(lang, acceptLanguage, phone)).replace("{code}", code));
  } catch (err) {
    console.error("Failed to send OTP", err);
    return { ok: false, status: 500, error: "Failed to send OTP" };
  }

  return { ok: true, data: { phone } };
}

export async function verifyLoyaltyOtp(
  rawPhone: unknown,
  code: unknown,
  ip: string
): Promise<LoyaltyAuthResult<{ phone: string }>> {
  if (!rawPhone || !code) {
    return { ok: false, status: 400, error: "Missing fields" };
  }

  const phone = normalizePhone(String(rawPhone));

  // A 4-digit code is brute-forceable — cap verification attempts.
  if (
    !(await rateLimitPersistent(`otp-verify-phone:${phone}`, 5, 10 * 60_000)) ||
    !(await rateLimitPersistent(`otp-verify-ip:${ip}`, 20, 10 * 60_000))
  ) {
    return { ok: false, status: 429, error: "Too many attempts" };
  }

  const otp = await getOtp(phone);
  if (!otp) {
    return { ok: false, status: 401, error: "Invalid or expired code" };
  }

  if (new Date(otp.expires_at) < new Date()) {
    return { ok: false, status: 401, error: "Code expired" };
  }

  // Counted in the database next to the code, so spreading guesses over many
  // server instances or waiting out an in-memory limiter does not help: the
  // code is destroyed after MAX_OTP_ATTEMPTS wrong tries.
  const attempt = await registerOtpAttempt(phone, MAX_OTP_ATTEMPTS);
  if (attempt > MAX_OTP_ATTEMPTS) {
    return { ok: false, status: 429, error: "Too many attempts" };
  }

  const storedBuf = Buffer.from(otp.otp_code);
  const submittedBuf = Buffer.from(String(code).padEnd(storedBuf.length));
  const match =
    storedBuf.length === submittedBuf.length && timingSafeEqual(storedBuf, submittedBuf);

  if (!match) {
    return { ok: false, status: 401, error: "Invalid or expired code" };
  }

  await deleteOtp(phone);

  return { ok: true, data: { phone } };
}
