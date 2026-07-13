import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface LoyaltySessionData {
  customerUserId?: string;
  email?: string;
  locationId?: number;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "starlinkee_loyalty",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    // Login is a one-time Google Sign-In, not a re-verified-per-visit code —
    // keep the customer signed in indefinitely (until they explicitly log out).
    maxAge: 60 * 60 * 24 * 365 * 10,
  },
};

export async function getLoyaltySession() {
  const cookieStore = await cookies();
  return getIronSession<LoyaltySessionData>(cookieStore, sessionOptions);
}

export async function setLoyaltySession(customerUserId: string, email: string, locationId: number): Promise<void> {
  const session = await getLoyaltySession();
  session.customerUserId = customerUserId;
  session.email = email;
  session.locationId = locationId;
  await session.save();
}

export async function clearLoyaltySession(): Promise<void> {
  const session = await getLoyaltySession();
  session.destroy();
}
