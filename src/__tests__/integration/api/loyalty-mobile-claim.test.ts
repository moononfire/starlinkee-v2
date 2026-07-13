import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockVerifyMobileToken, mockGetLocationBySlug, mockGetLocationById, mockGetLoyaltyCard, mockResetLoyaltyCard } =
  vi.hoisted(() => ({
    mockVerifyMobileToken: vi.fn(),
    mockGetLocationBySlug: vi.fn(),
    mockGetLocationById: vi.fn(),
    mockGetLoyaltyCard: vi.fn(),
    mockResetLoyaltyCard: vi.fn(),
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
  resetLoyaltyCard: mockResetLoyaltyCard,
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
  mockResetLoyaltyCard.mockResolvedValue(undefined);
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

  it("returns 200 and resets card when stamps >= 10", async () => {
    mockGetLoyaltyCard.mockResolvedValue({ id: 5, stamps_count: 10 });
    const res = await POST(request());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.stamps).toBe(0);
    expect(mockResetLoyaltyCard).toHaveBeenCalledWith(5);
  });

  it("queries card with correct locationId and phone from session", async () => {
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 10 });
    await POST(request());
    expect(mockGetLoyaltyCard).toHaveBeenCalledWith(1, "+48600000000");
  });
});
