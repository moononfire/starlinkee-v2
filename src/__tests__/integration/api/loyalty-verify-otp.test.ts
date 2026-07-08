import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetLocationBySlug, mockGetOtp, mockDeleteOtp, mockSetLoyaltySession, mockGetLoyaltyCard } = vi.hoisted(() => ({
  mockGetLocationBySlug: vi.fn(),
  mockGetOtp: vi.fn(),
  mockDeleteOtp: vi.fn(),
  mockSetLoyaltySession: vi.fn(),
  mockGetLoyaltyCard: vi.fn(),
}));

vi.mock("@/lib/db/locations", () => ({ getLocationBySlug: mockGetLocationBySlug }));
vi.mock("@/lib/db/loyalty", () => ({ getOtp: mockGetOtp, deleteOtp: mockDeleteOtp, getLoyaltyCard: mockGetLoyaltyCard }));
vi.mock("@/lib/session", () => ({ setLoyaltySession: mockSetLoyaltySession }));

import { POST } from "@/app/api/loyalty/verify-otp/route";
import { resetRateLimits } from "@/lib/rate-limit";

const location = { location_id: 1, has_loyalty_enabled: true, loyalty_stamps_required: 10 };
const validOtp = {
  otp_code: "5678",
  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/loyalty/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  mockGetLocationBySlug.mockResolvedValue(location);
  mockGetOtp.mockResolvedValue(validOtp);
  mockDeleteOtp.mockResolvedValue(undefined);
  mockSetLoyaltySession.mockResolvedValue(undefined);
  mockGetLoyaltyCard.mockResolvedValue(null);
});

describe("POST /api/loyalty/verify-otp", () => {
  it("returns 400 on missing fields", async () => {
    const res = await POST(makeRequest({ phone: "+48600000000", slug: "x" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when location not found", async () => {
    mockGetLocationBySlug.mockResolvedValue(null);
    const res = await POST(makeRequest({ phone: "+48600000000", code: "5678", slug: "x" }));
    expect(res.status).toBe(404);
  });

  it("returns 401 when no OTP in database", async () => {
    mockGetOtp.mockResolvedValue(null);
    const res = await POST(makeRequest({ phone: "+48600000000", code: "5678", slug: "x" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when OTP is expired", async () => {
    mockGetOtp.mockResolvedValue({
      otp_code: "5678",
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    const res = await POST(makeRequest({ phone: "+48600000000", code: "5678", slug: "x" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 for wrong code", async () => {
    const res = await POST(makeRequest({ phone: "+48600000000", code: "0000", slug: "x" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 and sets session for correct code", async () => {
    const res = await POST(makeRequest({ phone: "+48600000000", code: "5678", slug: "x" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockDeleteOtp).toHaveBeenCalledOnce();
    expect(mockSetLoyaltySession).toHaveBeenCalledWith("+48600000000", 1);
  });

  it("returns the existing stamp count so the client doesn't show a stale 0", async () => {
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 2, last_stamp_at: new Date().toISOString() });
    const res = await POST(makeRequest({ phone: "+48600000000", code: "5678", slug: "x" }));
    const body = await res.json();
    expect(body.stamps).toBe(2);
    expect(body.reward_ready).toBe(false);
  });

  it("reports reward_ready when stamps already meet the threshold", async () => {
    mockGetLoyaltyCard.mockResolvedValue({ id: 1, stamps_count: 10, last_stamp_at: new Date().toISOString() });
    const res = await POST(makeRequest({ phone: "+48600000000", code: "5678", slug: "x" }));
    const body = await res.json();
    expect(body.reward_ready).toBe(true);
  });

  it("returns 0 stamps when no card exists yet", async () => {
    const res = await POST(makeRequest({ phone: "+48600000000", code: "5678", slug: "x" }));
    const body = await res.json();
    expect(body.stamps).toBe(0);
  });
});
