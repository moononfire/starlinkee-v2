import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetLoyaltySession,
  mockGetLoyaltyCard,
  mockCreateLoyaltyCard,
  mockIncrementStamp,
  mockGetLocationById,
  mockValidateScanToken,
} = vi.hoisted(() => ({
  mockGetLoyaltySession: vi.fn(),
  mockGetLoyaltyCard: vi.fn(),
  mockCreateLoyaltyCard: vi.fn(),
  mockIncrementStamp: vi.fn(),
  mockGetLocationById: vi.fn(),
  mockValidateScanToken: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getLoyaltySession: mockGetLoyaltySession }));
vi.mock("@/lib/db/loyalty", () => ({
  getLoyaltyCard: mockGetLoyaltyCard,
  createLoyaltyCard: mockCreateLoyaltyCard,
  incrementStamp: mockIncrementStamp,
}));
vi.mock("@/lib/db/locations", () => ({ getLocationById: mockGetLocationById }));
vi.mock("@/lib/db/scan-tokens", () => ({ validateScanToken: mockValidateScanToken }));

import { POST } from "@/app/api/loyalty/collect/route";
import type { NextRequest } from "next/server";

const session = { customerUserId: "11111111-1111-1111-1111-111111111111", locationId: 1 };

function requestWithToken(scanToken: string | undefined = "valid-token") {
  return { json: async () => ({ scanToken }) } as unknown as NextRequest;
}

function requestWithoutToken() {
  return { json: async () => ({}) } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLoyaltySession.mockResolvedValue(session);
  mockGetLocationById.mockResolvedValue({ location_id: 1, loyalty_stamps_required: 10 });
  mockValidateScanToken.mockResolvedValue({ valid: true, locationId: 1 });
});

describe("POST /api/loyalty/collect", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetLoyaltySession.mockResolvedValue({});
    const res = await POST(requestWithToken());
    expect(res.status).toBe(401);
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
    expect(mockCreateLoyaltyCard).toHaveBeenCalledWith(1, "11111111-1111-1111-1111-111111111111");
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
    const recentStamp = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 3, last_stamp_at: recentStamp });

    const res = await POST(requestWithToken());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toBe("cooldown");
    expect(body.remaining_seconds).toBeGreaterThan(0);
    expect(body.remaining_seconds).toBeLessThanOrEqual(11 * 3600 + 60);
  });

  it("increments stamp when cooldown has passed", async () => {
    const oldStamp = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(); // 13 hours ago
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 5, last_stamp_at: oldStamp });
    mockIncrementStamp.mockResolvedValue({ stamps_count: 6 });

    const res = await POST(requestWithToken());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stamps).toBe(6);
    expect(body.reward_ready).toBe(false);
  });

  it("returns reward_ready=true when increment brings stamps to 10", async () => {
    const oldStamp = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 9, last_stamp_at: oldStamp });
    mockIncrementStamp.mockResolvedValue({ stamps_count: 10 });

    const res = await POST(requestWithToken());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stamps).toBe(10);
    expect(body.reward_ready).toBe(true);
  });

  it("collects stamp when card has null last_stamp_at", async () => {
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 2, last_stamp_at: null });
    mockIncrementStamp.mockResolvedValue({ stamps_count: 3 });

    const res = await POST(requestWithToken());
    expect(res.status).toBe(200);
    expect(mockIncrementStamp).toHaveBeenCalledOnce();
  });

  it("returns reward_ready=true at a custom loyalty_stamps_required threshold", async () => {
    mockGetLocationById.mockResolvedValue({ location_id: 1, loyalty_stamps_required: 5 });
    const oldStamp = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 4, last_stamp_at: oldStamp });
    mockIncrementStamp.mockResolvedValue({ stamps_count: 5 });

    const res = await POST(requestWithToken());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stamps).toBe(5);
    expect(body.reward_ready).toBe(true);
  });

  it("does not increment past a custom threshold", async () => {
    mockGetLocationById.mockResolvedValue({ location_id: 1, loyalty_stamps_required: 5 });
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 5, last_stamp_at: null });

    const res = await POST(requestWithToken());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reward_ready).toBe(true);
    expect(mockIncrementStamp).not.toHaveBeenCalled();
  });

  it("falls back to 10 stamps when location is missing", async () => {
    mockGetLocationById.mockResolvedValue(null);
    const oldStamp = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 8, last_stamp_at: oldStamp });
    mockIncrementStamp.mockResolvedValue({ stamps_count: 9 });

    const res = await POST(requestWithToken());
    const body = await res.json();
    expect(body.reward_ready).toBe(false);
  });
});
