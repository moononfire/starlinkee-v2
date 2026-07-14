import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockVerifyMobileToken, mockGetLocationBySlug, mockGetLocationById, mockGetLoyaltyCard, mockSetRedeemCode } =
  vi.hoisted(() => ({
    mockVerifyMobileToken: vi.fn(),
    mockGetLocationBySlug: vi.fn(),
    mockGetLocationById: vi.fn(),
    mockGetLoyaltyCard: vi.fn(),
    mockSetRedeemCode: vi.fn(),
  }));

vi.mock("@/lib/mobile-session", () => ({
  verifyMobileToken: mockVerifyMobileToken,
  getBearerToken: () => "token",
}));
vi.mock("@/lib/db/locations", () => ({
  getLocationBySlug: mockGetLocationBySlug,
  getLocationById: mockGetLocationById,
}));
vi.mock("@/lib/db/loyalty", () => ({
  getLoyaltyCard: mockGetLoyaltyCard,
  setRedeemCode: mockSetRedeemCode,
}));
vi.mock("@/lib/db/leads", () => ({
  generateCouponCode: () => "ABCD1234",
}));

import { POST } from "@/app/api/mobile/loyalty/claim/route";
import type { NextRequest } from "next/server";

function request(slug = "my-restaurant") {
  return { json: async () => ({ slug }) } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyMobileToken.mockResolvedValue({ phone: "+48600000000" });
  mockGetLocationBySlug.mockResolvedValue({ location_id: 1, has_loyalty_enabled: true, loyalty_stamps_required: 10 });
  mockGetLocationById.mockResolvedValue({ location_id: 1, has_loyalty_enabled: true, loyalty_stamps_required: 10 });
  mockSetRedeemCode.mockResolvedValue(undefined);
});

describe("POST /api/mobile/loyalty/claim", () => {
  it("returns 401 when not authenticated", async () => {
    mockVerifyMobileToken.mockResolvedValue(null);
    const res = await POST(request());
    expect(res.status).toBe(401);
  });

  it("returns 404 when location not found", async () => {
    mockGetLocationBySlug.mockResolvedValue(null);
    const res = await POST(request());
    expect(res.status).toBe(404);
  });

  it("returns 400 when card not found", async () => {
    mockGetLoyaltyCard.mockResolvedValue(null);
    const res = await POST(request());
    expect(res.status).toBe(400);
  });

  it("returns 400 when stamps < 10", async () => {
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 9 });
    const res = await POST(request());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("No reward available");
  });

  it("returns 200 with a redeem code when stamps >= 10", async () => {
    mockGetLoyaltyCard.mockResolvedValue({ id: 5, stamps_count: 10 });
    const res = await POST(request());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.code).toBe("ABCD1234");
    expect(body.expires_at).toBeTruthy();
    expect(mockSetRedeemCode).toHaveBeenCalledWith(5, "ABCD1234", expect.any(String));
  });

  it("reuses an existing unexpired redeem code instead of generating a new one", async () => {
    const requestedAt = new Date().toISOString();
    mockGetLoyaltyCard.mockResolvedValue({
      id: 5,
      stamps_count: 10,
      redeem_code: "EXIST999",
      redeem_requested_at: requestedAt,
      redeem_used_at: null,
    });
    const res = await POST(request());
    const body = await res.json();
    expect(body.code).toBe("EXIST999");
    expect(mockSetRedeemCode).not.toHaveBeenCalled();
  });

  it("queries card with correct locationId and phone from session", async () => {
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 10 });
    await POST(request());
    expect(mockGetLoyaltyCard).toHaveBeenCalledWith(1, "+48600000000");
  });
});
