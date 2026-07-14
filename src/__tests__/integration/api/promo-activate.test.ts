import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetLeadByToken, mockGetLeadByCouponCode, mockMarkLeadAsUsed, mockGetLoyaltyCardByRedeemCode, mockConfirmRedemption } =
  vi.hoisted(() => ({
    mockGetLeadByToken: vi.fn(),
    mockGetLeadByCouponCode: vi.fn(),
    mockMarkLeadAsUsed: vi.fn(),
    mockGetLoyaltyCardByRedeemCode: vi.fn(),
    mockConfirmRedemption: vi.fn(),
  }));

vi.mock("@/lib/db/leads", () => ({
  getLeadByToken: mockGetLeadByToken,
  getLeadByCouponCode: mockGetLeadByCouponCode,
  markLeadAsUsed: mockMarkLeadAsUsed,
  CLAIM_WINDOW_MS: 15 * 60 * 1000,
}));

vi.mock("@/lib/db/loyalty", () => ({
  getLoyaltyCardByRedeemCode: mockGetLoyaltyCardByRedeemCode,
  confirmRedemption: mockConfirmRedemption,
}));

import { POST } from "@/app/api/promo/activate/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/promo/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMarkLeadAsUsed.mockResolvedValue(undefined);
  mockConfirmRedemption.mockResolvedValue(undefined);
  mockGetLeadByCouponCode.mockResolvedValue(null);
  mockGetLoyaltyCardByRedeemCode.mockResolvedValue(null);
});

describe("POST /api/promo/activate", () => {
  it("returns 400 when token is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown token", async () => {
    mockGetLeadByToken.mockResolvedValue(null);
    const res = await POST(makeRequest({ token: "nonexistent" }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when coupon is already used", async () => {
    mockGetLeadByToken.mockResolvedValue({ id: 1, is_used: true });
    const res = await POST(makeRequest({ token: "used-token" }));
    expect(res.status).toBe(409);
  });

  it("returns 200 and marks lead as used for valid unused token", async () => {
    mockGetLeadByToken.mockResolvedValue({ id: 5, is_used: false });
    const res = await POST(makeRequest({ token: "valid-token" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockMarkLeadAsUsed).toHaveBeenCalledWith(5);
  });

  it("does not call markLeadAsUsed when token is invalid", async () => {
    mockGetLeadByToken.mockResolvedValue(null);
    await POST(makeRequest({ token: "bad" }));
    expect(mockMarkLeadAsUsed).not.toHaveBeenCalled();
  });

  it("returns 410 when the promo code's 15-minute window lapsed", async () => {
    mockGetLeadByToken.mockResolvedValue({
      id: 5,
      is_used: false,
      claimed_at: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
    });
    const res = await POST(makeRequest({ token: "stale-token" }));
    expect(res.status).toBe(410);
    expect(mockMarkLeadAsUsed).not.toHaveBeenCalled();
  });

  it("confirms a loyalty redemption when given a matching code", async () => {
    mockGetLoyaltyCardByRedeemCode.mockResolvedValue({
      id: 9,
      redeem_used_at: null,
      redeem_requested_at: new Date().toISOString(),
    });
    const res = await POST(makeRequest({ code: "abcd1234" }));
    expect(res.status).toBe(200);
    expect(mockConfirmRedemption).toHaveBeenCalledWith(9);
  });

  it("returns 410 when the loyalty code's 15-minute window lapsed", async () => {
    mockGetLoyaltyCardByRedeemCode.mockResolvedValue({
      id: 9,
      redeem_used_at: null,
      redeem_requested_at: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
    });
    const res = await POST(makeRequest({ code: "ABCD1234" }));
    expect(res.status).toBe(410);
    expect(mockConfirmRedemption).not.toHaveBeenCalled();
  });

  it("returns 409 when the loyalty code was already used", async () => {
    mockGetLoyaltyCardByRedeemCode.mockResolvedValue({ id: 9, redeem_used_at: new Date().toISOString() });
    const res = await POST(makeRequest({ code: "ABCD1234" }));
    expect(res.status).toBe(409);
  });
});
