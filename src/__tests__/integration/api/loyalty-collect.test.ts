import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetLoyaltySession, mockGetLoyaltyCard, mockCreateLoyaltyCard, mockIncrementStamp } =
  vi.hoisted(() => ({
    mockGetLoyaltySession: vi.fn(),
    mockGetLoyaltyCard: vi.fn(),
    mockCreateLoyaltyCard: vi.fn(),
    mockIncrementStamp: vi.fn(),
  }));

vi.mock("@/lib/session", () => ({ getLoyaltySession: mockGetLoyaltySession }));
vi.mock("@/lib/db/loyalty", () => ({
  getLoyaltyCard: mockGetLoyaltyCard,
  createLoyaltyCard: mockCreateLoyaltyCard,
  incrementStamp: mockIncrementStamp,
}));

import { POST } from "@/app/api/loyalty/collect/route";

const session = { phone: "+48600000000", locationId: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLoyaltySession.mockResolvedValue(session);
});

describe("POST /api/loyalty/collect", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetLoyaltySession.mockResolvedValue({});
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("creates card with 1 stamp when none exists", async () => {
    mockGetLoyaltyCard.mockResolvedValue(null);
    mockCreateLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 1, last_stamp_at: new Date().toISOString() });

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stamps).toBe(1);
    expect(body.reward_ready).toBe(false);
    expect(mockCreateLoyaltyCard).toHaveBeenCalledWith(1, "+48600000000");
  });

  it("returns reward_ready=true when stamps already at 10", async () => {
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 10, last_stamp_at: null });

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stamps).toBe(10);
    expect(body.reward_ready).toBe(true);
    expect(mockIncrementStamp).not.toHaveBeenCalled();
  });

  it("returns 429 cooldown when last stamp was within 12 hours", async () => {
    const recentStamp = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 3, last_stamp_at: recentStamp });

    const res = await POST();
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

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stamps).toBe(6);
    expect(body.reward_ready).toBe(false);
  });

  it("returns reward_ready=true when increment brings stamps to 10", async () => {
    const oldStamp = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 9, last_stamp_at: oldStamp });
    mockIncrementStamp.mockResolvedValue({ stamps_count: 10 });

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stamps).toBe(10);
    expect(body.reward_ready).toBe(true);
  });

  it("collects stamp when card has null last_stamp_at", async () => {
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 2, last_stamp_at: null });
    mockIncrementStamp.mockResolvedValue({ stamps_count: 3 });

    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockIncrementStamp).toHaveBeenCalledOnce();
  });
});
