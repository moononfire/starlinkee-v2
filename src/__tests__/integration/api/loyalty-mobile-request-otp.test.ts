import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockUpsertOtp, mockSendSms } = vi.hoisted(() => ({
  mockUpsertOtp: vi.fn(),
  mockSendSms: vi.fn(),
}));

vi.mock("@/lib/db/loyalty", () => ({ upsertOtp: mockUpsertOtp }));
vi.mock("@/lib/sms", () => ({ sendSms: mockSendSms }));

import { POST } from "@/app/api/mobile/loyalty/request-otp/route";
import { resetRateLimits } from "@/lib/rate-limit";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/mobile/loyalty/request-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  mockUpsertOtp.mockResolvedValue(undefined);
  mockSendSms.mockResolvedValue(undefined);
});

describe("POST /api/mobile/loyalty/request-otp", () => {
  it("returns 400 when phone is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid phone", async () => {
    const res = await POST(makeRequest({ phone: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 and sends OTP on valid request", async () => {
    const res = await POST(makeRequest({ phone: "+48600000000" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockUpsertOtp).toHaveBeenCalledOnce();
    expect(mockSendSms).toHaveBeenCalledOnce();
  });

  it("stores a 4-digit OTP code", async () => {
    await POST(makeRequest({ phone: "+48600000000" }));
    const [, code] = mockUpsertOtp.mock.calls[0];
    expect(/^\d{4}$/.test(code)).toBe(true);
  });

  it("OTP expires in approximately 3 minutes", async () => {
    const before = Date.now();
    await POST(makeRequest({ phone: "+48600000000" }));
    const [, , expiresAt] = mockUpsertOtp.mock.calls[0];
    const diff = expiresAt.getTime() - before;
    expect(diff).toBeGreaterThanOrEqual(3 * 60 * 1000 - 100);
    expect(diff).toBeLessThanOrEqual(3 * 60 * 1000 + 500);
  });

  it.each([
    ["de", "Dein Bestätigungscode: "],
    ["pl", "Twój kod weryfikacyjny: "],
    ["it", "Il tuo codice di verifica: "],
    ["en", "Your verification code: "],
  ])("sends the SMS in the guest's language (%s)", async (lang, prefix) => {
    await POST(makeRequest({ phone: "+48600000000", lang }));
    const [, text] = mockSendSms.mock.calls[0];
    const [, code] = mockUpsertOtp.mock.calls[0];
    expect(text).toBe(`${prefix}${code}`);
  });

  it.each([
    ["+48600000000", "Twój kod weryfikacyjny: "],
    ["+4915112345678", "Dein Bestätigungscode: "],
    ["+436641234567", "Dein Bestätigungscode: "],
    ["+393331234567", "Il tuo codice di verifica: "],
    ["+447911123456", "Your verification code: "],
  ])("without lang the number's country prefix picks the language (%s)", async (phone, prefix) => {
    await POST(makeRequest({ phone }));
    const [, code] = mockUpsertOtp.mock.calls[0];
    expect(mockSendSms.mock.calls[0][1]).toBe(`${prefix}${code}`);
  });

  it.each([[{ lang: "zh" }], [{ lang: 7 }]])("an unsupported lang (%j) is ignored: the number decides", async (extra) => {
    await POST(makeRequest({ phone: "+48600000000", ...extra }));
    expect(mockSendSms.mock.calls[0][1]).toMatch(/^Twój kod weryfikacyjny: \d{4}$/);
  });

  it("Accept-Language beats the number prefix (first supported tag)", async () => {
    const req = new NextRequest("http://localhost/api/mobile/loyalty/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept-Language": "fr-FR,de-DE;q=0.8,en;q=0.5" },
      body: JSON.stringify({ phone: "+48600000000" }),
    });
    await POST(req);
    expect(mockSendSms.mock.calls[0][1]).toMatch(/^Dein Bestätigungscode: \d{4}$/);
  });

  it("lang from the body beats Accept-Language and the number", async () => {
    const req = new NextRequest("http://localhost/api/mobile/loyalty/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept-Language": "de" },
      body: JSON.stringify({ phone: "+48600000000", lang: "it" }),
    });
    await POST(req);
    expect(mockSendSms.mock.calls[0][1]).toMatch(/^Il tuo codice di verifica: \d{4}$/);
  });

  it("returns 500 when SMS sending fails", async () => {
    mockSendSms.mockRejectedValue(new Error("network error"));
    const res = await POST(makeRequest({ phone: "+48600000000" }));
    expect(res.status).toBe(500);
  });
});
