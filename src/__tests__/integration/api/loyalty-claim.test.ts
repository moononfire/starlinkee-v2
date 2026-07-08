import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetLoyaltySession, mockGetLoyaltyCard, mockResetLoyaltyCard, mockGetLocationById } =
  vi.hoisted(() => ({
    mockGetLoyaltySession: vi.fn(),
    mockGetLoyaltyCard: vi.fn(),
    mockResetLoyaltyCard: vi.fn(),
    mockGetLocationById: vi.fn(),
  }));

vi.mock("@/lib/session", () => ({ getLoyaltySession: mockGetLoyaltySession }));
vi.mock("@/lib/db/loyalty", () => ({
  getLoyaltyCard: mockGetLoyaltyCard,
  resetLoyaltyCard: mockResetLoyaltyCard,
}));
vi.mock("@/lib/db/locations", () => ({ getLocationById: mockGetLocationById }));

import { POST } from "@/app/api/loyalty/claim/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetLoyaltySession.mockResolvedValue({ phone: "+48600000000", locationId: 1 });
  mockResetLoyaltyCard.mockResolvedValue(undefined);
  mockGetLocationById.mockResolvedValue({ location_id: 1, loyalty_stamps_required: 10 });
});

describe("POST /api/loyalty/claim", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetLoyaltySession.mockResolvedValue({});
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 400 when card not found", async () => {
    mockGetLoyaltyCard.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(400);
  });

  it("returns 400 when stamps < 10", async () => {
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 9 });
    const res = await POST();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("No reward available");
  });

  it("returns 200 and resets card when stamps >= 10", async () => {
    mockGetLoyaltyCard.mockResolvedValue({ id: 5, stamps_count: 10 });
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.stamps).toBe(0);
    expect(mockResetLoyaltyCard).toHaveBeenCalledWith(5);
  });

  it("queries card with correct locationId and phone from session", async () => {
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 10 });
    await POST();
    expect(mockGetLoyaltyCard).toHaveBeenCalledWith(1, "+48600000000");
  });

  it("uses location's loyalty_stamps_required as the threshold", async () => {
    mockGetLocationById.mockResolvedValue({ location_id: 1, loyalty_stamps_required: 5 });
    mockGetLoyaltyCard.mockResolvedValue({ id: 7, stamps_count: 5 });
    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockResetLoyaltyCard).toHaveBeenCalledWith(7);
  });

  it("returns 400 when stamps are below a custom threshold", async () => {
    mockGetLocationById.mockResolvedValue({ location_id: 1, loyalty_stamps_required: 8 });
    mockGetLoyaltyCard.mockResolvedValue({ id: 7, stamps_count: 7 });
    const res = await POST();
    expect(res.status).toBe(400);
  });

  it("falls back to 10 stamps when location is missing", async () => {
    mockGetLocationById.mockResolvedValue(null);
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 9 });
    const res = await POST();
    expect(res.status).toBe(400);
  });
});
