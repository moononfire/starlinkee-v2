import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({
  getLeadByToken: vi.fn(),
  claimLead: vi.fn(),
  getLeadByCouponCode: vi.fn(),
  getLoyaltyCardByRedeemCode: vi.fn(),
  getLoyaltyCard: vi.fn(),
  getLocationById: vi.fn(),
  getLocationBySlug: vi.fn(),
  verifyMobileToken: vi.fn(),
  active: vi.fn(),
  activeById: vi.fn(),
}));

vi.mock("@/lib/db/leads", () => ({
  getLeadByToken: m.getLeadByToken,
  claimLead: m.claimLead,
  getLeadByCouponCode: m.getLeadByCouponCode,
  CLAIM_WINDOW_MS: 900_000,
}));
vi.mock("@/lib/db/loyalty", () => ({
  getLoyaltyCardByRedeemCode: m.getLoyaltyCardByRedeemCode,
  getLoyaltyCard: m.getLoyaltyCard,
}));
vi.mock("@/lib/db/locations", () => ({ getLocationById: m.getLocationById, getLocationBySlug: m.getLocationBySlug }));
vi.mock("@/lib/mobile-session", () => ({
  getBearerToken: () => "tok",
  verifyMobileToken: m.verifyMobileToken,
}));
vi.mock("@/lib/location-access", () => ({
  isLocationActive: m.active,
  isLocationActiveById: m.activeById,
  SUBSCRIPTION_INACTIVE: { error: "subscription_inactive" },
}));

import { POST as claim } from "@/app/api/promo/claim/route";
import { POST as verify } from "@/app/api/promo/verify/route";
import { GET as card } from "@/app/api/mobile/loyalty/card/route";

const post = (url: string, body: unknown) =>
  new NextRequest(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  m.active.mockResolvedValue(false);
  m.activeById.mockResolvedValue(false);
  m.getLocationById.mockResolvedValue({ location_id: 3, subscription_id: 4, location_name: "Cafe" });
  m.getLocationBySlug.mockResolvedValue({ location_id: 3, subscription_id: 4, has_loyalty_enabled: true });
  m.verifyMobileToken.mockResolvedValue({ phone: "+48600000000" });
});

describe("venue with a subscription that is not active (F11)", () => {
  it("POST /api/promo/claim -> 403, coupon is not claimed", async () => {
    m.getLeadByToken.mockResolvedValue({ id: 1, location_id: 3 });

    const res = await claim(post("http://localhost/api/promo/claim", { token: "t" }));

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("subscription_inactive");
    expect(m.claimLead).not.toHaveBeenCalled();
  });

  it("POST /api/promo/claim for an unknown token still answers 404", async () => {
    m.getLeadByToken.mockResolvedValue(null);
    m.claimLead.mockResolvedValue(null);

    const res = await claim(post("http://localhost/api/promo/claim", { token: "nope" }));

    expect(res.status).toBe(404);
  });

  it("POST /api/promo/verify (promo code) -> 403 and no coupon details", async () => {
    m.getLeadByCouponCode.mockResolvedValue({ id: 1, location_id: 3, is_used: false, claimed_at: null });

    const res = await verify(post("http://localhost/api/promo/verify", { code: "abc" }));

    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toContain("Cafe");
  });

  it("POST /api/promo/verify (loyalty code) -> 403", async () => {
    m.getLeadByCouponCode.mockResolvedValue(null);
    m.getLoyaltyCardByRedeemCode.mockResolvedValue({ id: 2, location_id: 3, redeem_used_at: null, redeem_requested_at: null });

    const res = await verify(post("http://localhost/api/promo/verify", { code: "abc" }));

    expect(res.status).toBe(403);
  });

  it("GET /api/mobile/loyalty/card -> 403 and the card is not read", async () => {
    const res = await card(new NextRequest("http://localhost/api/mobile/loyalty/card?slug=cafe"));

    expect(res.status).toBe(403);
    expect(m.getLoyaltyCard).not.toHaveBeenCalled();
  });

  it("active venue: verify still works", async () => {
    m.active.mockResolvedValue(true);
    m.getLeadByCouponCode.mockResolvedValue({ id: 1, location_id: 3, is_used: false, claimed_at: null, used_at: null });

    const res = await verify(post("http://localhost/api/promo/verify", { code: "abc" }));

    expect(res.status).toBe(200);
    expect((await res.json()).locationName).toBe("Cafe");
  });
});
