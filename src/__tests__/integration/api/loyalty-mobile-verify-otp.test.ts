import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetOtp, mockDeleteOtp, mockSignMobileToken, mockLinkLoyaltyEmail } = vi.hoisted(() => ({
  mockGetOtp: vi.fn(),
  mockDeleteOtp: vi.fn(),
  mockSignMobileToken: vi.fn(),
  mockLinkLoyaltyEmail: vi.fn(),
}));

vi.mock("@/lib/db/loyalty", () => ({
  getOtp: mockGetOtp,
  deleteOtp: mockDeleteOtp,
  linkLoyaltyEmail: mockLinkLoyaltyEmail,
}));
vi.mock("@/lib/mobile-session", () => ({ signMobileToken: mockSignMobileToken }));

import { POST } from "@/app/api/mobile/loyalty/verify-otp/route";
import { resetRateLimits } from "@/lib/rate-limit";

const validOtp = {
  otp_code: "5678",
  expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/mobile/loyalty/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  mockGetOtp.mockResolvedValue(validOtp);
  mockDeleteOtp.mockResolvedValue(undefined);
  mockSignMobileToken.mockResolvedValue("signed-token");
  mockLinkLoyaltyEmail.mockResolvedValue(undefined);
});

describe("POST /api/mobile/loyalty/verify-otp", () => {
  it("returns 400 on missing fields", async () => {
    const res = await POST(makeRequest({ phone: "+48600000000" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when no OTP in database", async () => {
    mockGetOtp.mockResolvedValue(null);
    const res = await POST(makeRequest({ phone: "+48600000000", code: "5678" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when OTP is expired", async () => {
    mockGetOtp.mockResolvedValue({
      otp_code: "5678",
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    const res = await POST(makeRequest({ phone: "+48600000000", code: "5678" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 for wrong code", async () => {
    const res = await POST(makeRequest({ phone: "+48600000000", code: "0000" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 and a token for correct code", async () => {
    const res = await POST(makeRequest({ phone: "+48600000000", code: "5678" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.token).toBe("signed-token");
    expect(mockDeleteOtp).toHaveBeenCalledOnce();
    expect(mockSignMobileToken).toHaveBeenCalledWith({ phone: "+48600000000" });
  });

  it("links the email to the phone when provided", async () => {
    const res = await POST(makeRequest({ phone: "+48600000000", code: "5678", email: "user@gmail.com" }));
    expect(res.status).toBe(200);
    expect(mockLinkLoyaltyEmail).toHaveBeenCalledWith("+48600000000", "user@gmail.com");
  });

  it("does not link an email when none is provided", async () => {
    const res = await POST(makeRequest({ phone: "+48600000000", code: "5678" }));
    expect(res.status).toBe(200);
    expect(mockLinkLoyaltyEmail).not.toHaveBeenCalled();
  });

  it("still logs in successfully even if linking the email fails", async () => {
    mockLinkLoyaltyEmail.mockRejectedValue(new Error("db error"));
    const res = await POST(makeRequest({ phone: "+48600000000", code: "5678", email: "user@gmail.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe("signed-token");
  });
});
