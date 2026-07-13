import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockVerifyMobileToken, mockGetLoyaltyCardsForPhone } = vi.hoisted(() => ({
  mockVerifyMobileToken: vi.fn(),
  mockGetLoyaltyCardsForPhone: vi.fn(),
}));

vi.mock("@/lib/mobile-session", () => ({
  verifyMobileToken: mockVerifyMobileToken,
  getBearerToken: () => "token",
}));
vi.mock("@/lib/db/loyalty", () => ({ getLoyaltyCardsForPhone: mockGetLoyaltyCardsForPhone }));

import { GET } from "@/app/api/mobile/loyalty/cards/route";
import type { NextRequest } from "next/server";

function request() {
  return {} as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyMobileToken.mockResolvedValue({ phone: "+48600000000" });
  mockGetLoyaltyCardsForPhone.mockResolvedValue([]);
});

describe("GET /api/mobile/loyalty/cards", () => {
  it("returns 401 when not authenticated", async () => {
    mockVerifyMobileToken.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
  });

  it("returns the phone and an empty list when no cards", async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.phone).toBe("+48600000000");
    expect(body.cards).toEqual([]);
  });

  it("maps card fields and computes reward_ready", async () => {
    mockGetLoyaltyCardsForPhone.mockResolvedValue([
      {
        location_id: 1,
        location_name: "Test Bistro",
        linktree_slug: "test-bistro",
        logo_link: "https://example.com/logo.jpg",
        stamps_count: 10,
        max_stamps: 10,
        last_stamp_at: "2026-07-14T00:00:00.000Z",
      },
      {
        location_id: 2,
        location_name: "Other Place",
        linktree_slug: "other-place",
        logo_link: null,
        stamps_count: 3,
        max_stamps: 10,
        last_stamp_at: null,
      },
    ]);
    const res = await GET(request());
    const body = await res.json();
    expect(body.cards).toHaveLength(2);
    expect(body.cards[0]).toEqual({
      slug: "test-bistro",
      location_name: "Test Bistro",
      logo_link: "https://example.com/logo.jpg",
      stamps: 10,
      max_stamps: 10,
      reward_ready: true,
      last_stamp_at: "2026-07-14T00:00:00.000Z",
    });
    expect(body.cards[1].reward_ready).toBe(false);
  });
});
