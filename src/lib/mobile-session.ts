import { sealData, unsealData } from "iron-session";

export interface MobileLoyaltySession {
  phone: string;
  locationId: number;
}

const TTL_SECONDS = 60 * 10; // 10 minutes — matches the web cookie session lifetime,
// forcing phone/SMS re-verification on every visit for the same reason.

export async function signMobileToken(session: MobileLoyaltySession): Promise<string> {
  return sealData(session, { password: process.env.SESSION_SECRET!, ttl: TTL_SECONDS });
}

export async function verifyMobileToken(token: string): Promise<MobileLoyaltySession | null> {
  try {
    const data = await unsealData<MobileLoyaltySession>(token, {
      password: process.env.SESSION_SECRET!,
      ttl: TTL_SECONDS,
    });
    if (!data.phone || !data.locationId) return null;
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
