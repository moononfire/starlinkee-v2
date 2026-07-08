import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface LoyaltySessionData {
  phone?: string;
  locationId?: number;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "starlinkee_loyalty",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes — force phone/SMS re-verification on every visit
  },
};

export async function getLoyaltySession() {
  const cookieStore = await cookies();
  return getIronSession<LoyaltySessionData>(cookieStore, sessionOptions);
}

export async function setLoyaltySession(phone: string, locationId: number): Promise<void> {
  const session = await getLoyaltySession();
  session.phone = phone;
  session.locationId = locationId;
  await session.save();
}

export async function clearLoyaltySession(): Promise<void> {
  const session = await getLoyaltySession();
  session.destroy();
}
