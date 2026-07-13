import { sealData, unsealData } from "iron-session";

export interface MobileLoyaltySession {
  customerUserId: string;
  email: string;
  locationId: number;
}

// Login is a one-time Google Sign-In, not a re-verified-per-visit code —
// ttl: 0 means the sealed token never expires (iron-session convention),
// matching the long-lived web cookie session.
const TTL_SECONDS = 0;

export async function signMobileToken(session: MobileLoyaltySession): Promise<string> {
  return sealData(session, { password: process.env.SESSION_SECRET!, ttl: TTL_SECONDS });
}

export async function verifyMobileToken(token: string): Promise<MobileLoyaltySession | null> {
  try {
    const data = await unsealData<MobileLoyaltySession>(token, {
      password: process.env.SESSION_SECRET!,
      ttl: TTL_SECONDS,
    });
    if (!data.customerUserId || !data.locationId) return null;
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
