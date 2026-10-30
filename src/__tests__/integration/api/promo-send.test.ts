import { describe, it, expect, vi, beforeEach } from "vitest";

const accessMock = vi.hoisted(() => ({ active: vi.fn(), activeById: vi.fn() }));
vi.mock("@/lib/location-access", () => ({
  isLocationActive: accessMock.active,
  isLocationActiveById: accessMock.activeById,
  SUBSCRIPTION_INACTIVE: { error: "subscription_inactive" },
}));
import { NextRequest } from "next/server";

const {
  mockGetLocationBySlug,
  mockCheckLeadExists,
  mockCreateLead,
  mockSendSms,
  mockSendPromoEmail,
  mockValidateScanToken,
  mockConsumeScanToken,
  mockGenerateCouponCode,
} = vi.hoisted(() => ({
  mockGetLocationBySlug: vi.fn(),
  mockCheckLeadExists: vi.fn(),
  mockCreateLead: vi.fn(),
  mockSendSms: vi.fn(),
  mockSendPromoEmail: vi.fn(),
  mockValidateScanToken: vi.fn(),
  mockConsumeScanToken: vi.fn(),
  mockGenerateCouponCode: vi.fn(),
}));

vi.mock("@/lib/db/locations", () => ({ getLocationBySlug: mockGetLocationBySlug }));
vi.mock("@/lib/db/leads", () => ({
  checkLeadExists: mockCheckLeadExists,
  createLead: mockCreateLead,
  generateCouponCode: mockGenerateCouponCode,
}));
vi.mock("@/lib/db/scan-tokens", () => ({
  validateScanToken: mockValidateScanToken,
  consumeScanToken: mockConsumeScanToken,
}));
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
  accessMock.active.mockResolvedValue(true);
  accessMock.activeById.mockResolvedValue(true);
  resetRateLimits();
  mockGetLocationBySlug.mockResolvedValue(location);
  mockCheckLeadExists.mockResolvedValue(false);
  mockCreateLead.mockResolvedValue({ id: 1, claim_token: "tok" });
  mockSendSms.mockResolvedValue(undefined);
  mockSendPromoEmail.mockResolvedValue(undefined);
  mockConsumeScanToken.mockResolvedValue(true);
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

  it("returns 403 and sends nothing when the scan token was already spent on a promo (replay)", async () => {
    mockConsumeScanToken.mockResolvedValue(false);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
    expect(mockCreateLead).not.toHaveBeenCalled();
    expect(mockSendSms).not.toHaveBeenCalled();
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

  it("normalizes the phone before dedup, storing and texting (same person, different spellings)", async () => {
    await POST(makeRequest({ ...validBody, phone: "600 000 000" }));
    expect(mockCheckLeadExists).toHaveBeenCalledWith(location.location_id, ["600 000 000", "+48600000000"]);
    expect(mockCreateLead.mock.calls[0][1]).toBe("+48600000000");
    expect(mockSendSms.mock.calls[0][0]).toBe("+48600000000");
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

  it("passes the guest's language to the promo email, English when it is unsupported", async () => {
    await POST(makeRequest({ ...validBody, email: "guest@example.com", lang: "de" }));
    expect(mockSendPromoEmail.mock.calls[0][2]).toBe("de");

    mockSendPromoEmail.mockClear();
    resetRateLimits();
    mockConsumeScanToken.mockResolvedValue(true);
    await POST(makeRequest({ ...validBody, email: "guest@example.com", lang: "zh" }));
    expect(mockSendPromoEmail.mock.calls[0][2]).toBe("en");
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

describe("POST /api/promo/send — SMS language", () => {
  const smsText = () => mockSendSms.mock.calls[0][1] as string;

  it("sends the Italian SMS text for lang it", async () => {
    mockGetLocationBySlug.mockResolvedValue({ ...location, promo_sms_text_it: "Sconto del 10%!" });
    const res = await POST(makeRequest({ ...validBody, lang: "it" }));
    expect(res.status).toBe(200);
    expect(smsText()).toContain("Sconto del 10%!");
  });

  it("uses the Italian default SMS when the venue has no Italian text", async () => {
    mockGetLocationBySlug.mockResolvedValue({ ...location, promo_sms_text: null });
    await POST(makeRequest({ ...validBody, lang: "it" }));
    expect(smsText()).toMatch(/^Ciao! La tua promozione/);
  });

  it("falls back to English for an unknown lang", async () => {
    mockGetLocationBySlug.mockResolvedValue({ ...location, promo_sms_text: null, promo_sms_text_en: "English text" });
    await POST(makeRequest({ ...validBody, lang: "xx" }));
    expect(smsText()).toContain("English text");
  });

  it("keeps every Italian SMS default inside GSM-7", async () => {
    const { t } = await import("@/lib/translations");
    // GSM-7 basic set (letters used by Italian) — no curly quotes, no ’, no exotic symbols
    expect(t("portal_promo_sms_placeholder", "it")).toMatch(/^[A-Za-z0-9 !"#%&'()*+,\-./:;<=>?@_{}èéùìòà]+$/);
  });
});

describe("POST /api/promo/send — venue subscription not active (F11)", () => {
  it("returns 403 and sends no SMS, e-mail or coupon", async () => {
    accessMock.active.mockResolvedValue(false);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("subscription_inactive");
    expect(mockCreateLead).not.toHaveBeenCalled();
    expect(mockSendSms).not.toHaveBeenCalled();
    expect(mockSendPromoEmail).not.toHaveBeenCalled();
    expect(mockConsumeScanToken).not.toHaveBeenCalled();
  });
});
