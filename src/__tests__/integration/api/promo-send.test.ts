import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetLocationBySlug,
  mockCheckLeadExists,
  mockCreateLead,
  mockSendSms,
  mockSendPromoEmail,
  mockValidateScanToken,
  mockGenerateCouponCode,
} = vi.hoisted(() => ({
  mockGetLocationBySlug: vi.fn(),
  mockCheckLeadExists: vi.fn(),
  mockCreateLead: vi.fn(),
  mockSendSms: vi.fn(),
  mockSendPromoEmail: vi.fn(),
  mockValidateScanToken: vi.fn(),
  mockGenerateCouponCode: vi.fn(),
}));

vi.mock("@/lib/db/locations", () => ({ getLocationBySlug: mockGetLocationBySlug }));
vi.mock("@/lib/db/leads", () => ({
  checkLeadExists: mockCheckLeadExists,
  createLead: mockCreateLead,
  generateCouponCode: mockGenerateCouponCode,
}));
vi.mock("@/lib/db/scan-tokens", () => ({ validateScanToken: mockValidateScanToken }));
vi.mock("@/lib/sms", () => ({ sendSms: mockSendSms }));
vi.mock("@/lib/email", () => ({ sendPromoEmail: mockSendPromoEmail }));

import { POST } from "@/app/api/promo/send/route";
import { resetRateLimits } from "@/lib/rate-limit";

const location = {
  location_id: 1,
  location_name: "Good Eats",
  has_promo_enabled: true,
  promo_sms_text: "Get 10% off!",
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/promo/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  phone: "+48600000000",
  slug: "good-eats",
  agreed: true,
  scanToken: "scan-token-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  mockGetLocationBySlug.mockResolvedValue(location);
  mockCheckLeadExists.mockResolvedValue(false);
  mockCreateLead.mockResolvedValue({ id: 1, claim_token: "tok" });
  mockSendSms.mockResolvedValue(undefined);
  mockSendPromoEmail.mockResolvedValue(undefined);
  mockValidateScanToken.mockResolvedValue({ valid: true, locationId: location.location_id });
  mockGenerateCouponCode.mockReturnValue("COUPON1");
});

describe("POST /api/promo/send", () => {
  it("returns 400 when phone is missing", async () => {
    const res = await POST(makeRequest({ slug: "x", agreed: true }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when agreed is false", async () => {
    const res = await POST(makeRequest({ phone: "+48600000000", slug: "x", agreed: false }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when slug is missing", async () => {
    const res = await POST(makeRequest({ phone: "+48600000000", agreed: true }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when location not found", async () => {
    mockGetLocationBySlug.mockResolvedValue(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
  });

  it("returns 404 when promo is disabled for location", async () => {
    mockGetLocationBySlug.mockResolvedValue({ ...location, has_promo_enabled: false });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
  });

  it("returns 409 when phone already claimed the promo", async () => {
    mockCheckLeadExists.mockResolvedValue(true);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
  });

  it("returns 200 and creates lead and sends SMS on success", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockCreateLead).toHaveBeenCalledOnce();
    expect(mockSendSms).toHaveBeenCalledOnce();
  });

  it("SMS contains claim URL with app URL prefix", async () => {
    await POST(makeRequest(validBody));
    const [, message] = mockSendSms.mock.calls[0];
    expect(message).toContain("https://app.test");
    expect(message).toContain("/l/good-eats/promo/claim/");
  });

  it("SMS uses promo_sms_text when available", async () => {
    await POST(makeRequest(validBody));
    const [, message] = mockSendSms.mock.calls[0];
    expect(message).toContain("Get 10% off!");
  });

  it("creates lead with a UUID claim token", async () => {
    await POST(makeRequest(validBody));
    const [, , , , token] = mockCreateLead.mock.calls[0];
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("sends optional promo email when email is provided", async () => {
    await POST(makeRequest({ ...validBody, email: "guest@example.com" }));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSendPromoEmail).toHaveBeenCalledOnce();
    expect(mockSendPromoEmail.mock.calls[0][0]).toBe("guest@example.com");
  });

  it("does not send promo email when email is not provided", async () => {
    await POST(makeRequest(validBody));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSendPromoEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when createLead throws", async () => {
    mockCreateLead.mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });
});
