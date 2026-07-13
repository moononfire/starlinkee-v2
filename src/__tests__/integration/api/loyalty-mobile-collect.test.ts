import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockVerifyMobileToken,
  mockGetLocationBySlug,
  mockGetLocationById,
  mockGetLoyaltyCard,
  mockCreateLoyaltyCard,
  mockIncrementStamp,
  mockValidateScanToken,
} = vi.hoisted(() => ({
  mockVerifyMobileToken: vi.fn(),
  mockGetLocationBySlug: vi.fn(),
  mockGetLocationById: vi.fn(),
  mockGetLoyaltyCard: vi.fn(),
  mockCreateLoyaltyCard: vi.fn(),
  mockIncrementStamp: vi.fn(),
  mockValidateScanToken: vi.fn(),
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
  createLoyaltyCard: mockCreateLoyaltyCard,
  incrementStamp: mockIncrementStamp,
}));
vi.mock("@/lib/db/scan-tokens", () => ({ validateScanToken: mockValidateScanToken }));

import { POST } from "@/app/api/mobile/loyalty/collect/route";
import type { NextRequest } from "next/server";

const session = { phone: "+48600000000" };
const location = { location_id: 1, has_loyalty_enabled: true, loyalty_stamps_required: 10 };

function requestWithToken(scanToken: string | undefined = "valid-token", slug = "my-restaurant") {
  return { json: async () => ({ slug, scanToken }) } as unknown as NextRequest;
}

function requestWithoutToken(slug = "my-restaurant") {
  return { json: async () => ({ slug }) } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockVerifyMobileToken.mockResolvedValue(session);
  mockGetLocationBySlug.mockResolvedValue(location);
  mockGetLocationById.mockResolvedValue(location);
  mockValidateScanToken.mockResolvedValue({ valid: true, locationId: 1 });
});

describe("POST /api/mobile/loyalty/collect", () => {
  it("returns 401 when not authenticated", async () => {
    mockVerifyMobileToken.mockResolvedValue(null);
    const res = await POST(requestWithToken());
    expect(res.status).toBe(401);
  });

  it("returns 404 when location not found", async () => {
    mockGetLocationBySlug.mockResolvedValue(null);
    const res = await POST(requestWithToken());
    expect(res.status).toBe(404);
  });

  it("returns 403 when scan token is missing", async () => {
    const res = await POST(requestWithoutToken());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("scan_required");
    expect(mockGetLoyaltyCard).not.toHaveBeenCalled();
  });

  it("returns 403 when scan token is invalid or expired", async () => {
    mockValidateScanToken.mockResolvedValue({ valid: false });
    const res = await POST(requestWithToken("bad-token"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("scan_required");
  });

  it("returns 403 when scan token belongs to a different location", async () => {
    mockValidateScanToken.mockResolvedValue({ valid: true, locationId: 2 });
    const res = await POST(requestWithToken());
    expect(res.status).toBe(403);
  });

  it("creates card with 1 stamp when none exists", async () => {
    mockGetLoyaltyCard.mockResolvedValue(null);
    mockCreateLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 1, last_stamp_at: new Date().toISOString() });

    const res = await POST(requestWithToken());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stamps).toBe(1);
    expect(body.reward_ready).toBe(false);
    expect(mockCreateLoyaltyCard).toHaveBeenCalledWith(1, "+48600000000");
  });

  it("returns reward_ready=true when stamps already at 10", async () => {
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 10, last_stamp_at: null });

    const res = await POST(requestWithToken());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stamps).toBe(10);
    expect(body.reward_ready).toBe(true);
    expect(mockIncrementStamp).not.toHaveBeenCalled();
  });

  it("returns 429 cooldown when last stamp was within 12 hours", async () => {
    const recentStamp = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 3, last_stamp_at: recentStamp });

    const res = await POST(requestWithToken());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("cooldown");
    expect(body.remaining_seconds).toBeGreaterThan(0);
    expect(body.remaining_seconds).toBeLessThanOrEqual(11 * 3600 + 60);
  });

  it("increments stamp when cooldown has passed", async () => {
    const oldStamp = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 5, last_stamp_at: oldStamp });
    mockIncrementStamp.mockResolvedValue({ stamps_count: 6 });

    const res = await POST(requestWithToken());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stamps).toBe(6);
    expect(body.reward_ready).toBe(false);
  });
});
