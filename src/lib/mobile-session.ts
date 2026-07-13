import { sealData, unsealData } from "iron-session";

export interface MobileLoyaltySession {
  phone: string;
}

// Login (Google Sign-In, then phone verified once via SMS OTP) is app-wide,
// not per-location, and the session stays valid — the fraud concern this is
// meant to fix is one phone == one card, not making customers re-verify
// every visit (which is what drove the switch to Google Sign-In in the
// first place, and which this revert doesn't want to redo).
const TTL_SECONDS = 60 * 60 * 24 * 365 * 10;

export async function signMobileToken(session: MobileLoyaltySession): Promise<string> {
  return sealData(session, { password: process.env.SESSION_SECRET!, ttl: TTL_SECONDS });
}

export async function verifyMobileToken(token: string): Promise<MobileLoyaltySession | null> {
  try {
    const data = await unsealData<MobileLoyaltySession>(token, {
      password: process.env.SESSION_SECRET!,
      ttl: TTL_SECONDS,
    });
    if (!data.phone) return null;
    return data;
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}
