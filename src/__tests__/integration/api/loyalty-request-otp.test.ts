import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetLocationBySlug, mockUpsertOtp, mockSendSms } = vi.hoisted(() => ({
  mockGetLocationBySlug: vi.fn(),
  mockUpsertOtp: vi.fn(),
  mockSendSms: vi.fn(),
}));

vi.mock("@/lib/db/locations", () => ({ getLocationBySlug: mockGetLocationBySlug }));
vi.mock("@/lib/db/loyalty", () => ({ upsertOtp: mockUpsertOtp }));
vi.mock("@/lib/sms", () => ({ sendSms: mockSendSms }));

import { POST } from "@/app/api/loyalty/request-otp/route";
import { resetRateLimits } from "@/lib/rate-limit";

const activeLocation = { location_id: 1, has_loyalty_enabled: true, location_name: "Test Bistro" };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/loyalty/request-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  mockGetLocationBySlug.mockResolvedValue(activeLocation);
  mockUpsertOtp.mockResolvedValue(undefined);
  mockSendSms.mockResolvedValue(undefined);
});

describe("POST /api/loyalty/request-otp", () => {
  it("returns 400 when phone is missing", async () => {
    const res = await POST(makeRequest({ slug: "my-restaurant" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when slug is missing", async () => {
    const res = await POST(makeRequest({ phone: "+48600000000" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when location not found", async () => {
    mockGetLocationBySlug.mockResolvedValue(null);
    const res = await POST(makeRequest({ phone: "+48600000000", slug: "unknown" }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when loyalty is disabled", async () => {
    mockGetLocationBySlug.mockResolvedValue({ ...activeLocation, has_loyalty_enabled: false });
    const res = await POST(makeRequest({ phone: "+48600000000", slug: "my-restaurant" }));
    expect(res.status).toBe(404);
  });

  it("returns 200 and sends OTP on valid request", async () => {
    const res = await POST(makeRequest({ phone: "+48600000000", slug: "my-restaurant" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockUpsertOtp).toHaveBeenCalledOnce();
    expect(mockSendSms).toHaveBeenCalledOnce();
  });

  it("stores a 4-digit OTP code", async () => {
    await POST(makeRequest({ phone: "+48600000000", slug: "my-restaurant" }));
    const [, , code] = mockUpsertOtp.mock.calls[0];
    expect(/^\d{4}$/.test(code)).toBe(true);
  });

  it("OTP expires in approximately 3 minutes", async () => {
    const before = Date.now();
    await POST(makeRequest({ phone: "+48600000000", slug: "my-restaurant" }));
    const [, , , expiresAt] = mockUpsertOtp.mock.calls[0];
    const diff = expiresAt.getTime() - before;
    expect(diff).toBeGreaterThanOrEqual(3 * 60 * 1000 - 100);
    expect(diff).toBeLessThanOrEqual(3 * 60 * 1000 + 500);
  });

  it("returns 500 when SMS sending fails", async () => {
    mockSendSms.mockRejectedValue(new Error("network error"));
    const res = await POST(makeRequest({ phone: "+48600000000", slug: "my-restaurant" }));
    expect(res.status).toBe(500);
  });
});
