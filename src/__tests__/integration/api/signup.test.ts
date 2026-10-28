import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGenerateLink, mockUpsert, mockGetCustomerByEmail, mockSendAccountLink } = vi.hoisted(() => ({
  mockGenerateLink: vi.fn(),
  mockUpsert: vi.fn(),
  mockGetCustomerByEmail: vi.fn(),
  mockSendAccountLink: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ auth: { admin: { generateLink: mockGenerateLink } } }),
}));
vi.mock("@/lib/db/customers", () => ({ upsertCustomerByEmail: mockUpsert }));
vi.mock("@/lib/db/portal", () => ({ getCustomerByEmail: mockGetCustomerByEmail }));
vi.mock("@/lib/email", () => ({ sendAccountLink: mockSendAccountLink }));

import { POST } from "@/app/api/signup/route";
import { resetRateLimits } from "@/lib/rate-limit";

function req(body: unknown, key: string | null = "test-www-key") {
  return new NextRequest("http://localhost/api/signup", {
    method: "POST",
    headers: key ? { "X-WWW-Key": key } : {},
    body: JSON.stringify(body),
  });
}

const body = { email: "Victim@Firma.pl", password: "password123", name: "Mallory" };

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  process.env.WWW_API_KEY = "test-www-key";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.test";
  mockGetCustomerByEmail.mockResolvedValue(null);
  mockUpsert.mockResolvedValue(7);
  mockSendAccountLink.mockResolvedValue(undefined);
  mockGenerateLink.mockResolvedValue({ data: { properties: { hashed_token: "hash123" } }, error: null });
});

describe("POST /api/signup", () => {
  it("requires the www key", async () => {
    expect((await POST(req(body, null))).status).toBe(401);
    expect(mockGenerateLink).not.toHaveBeenCalled();
  });

  it("creates an unconfirmed account via generateLink and emails a confirmation link; never returns customerId or a session", async () => {
    const res = await POST(req(body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(mockGenerateLink).toHaveBeenCalledWith({ type: "signup", email: "victim@firma.pl", password: "password123" });
    expect(mockUpsert).toHaveBeenCalledOnce();
    const [to, , data] = mockSendAccountLink.mock.calls[0];
    expect(to).toBe("victim@firma.pl");
    expect(data.kind).toBe("confirm");
    expect(data.link).toContain("https://app.test/portal/auth/confirm?");
    expect(data.link).toContain("token_hash=hash123");
    expect(data.link).toContain("type=signup");
  });

  it("does NOT touch an existing customer: no overwrite, no new account, neutral 200 + set-password mail", async () => {
    mockGetCustomerByEmail.mockResolvedValue({ customer_id: 3, preferred_language: "pl" });

    const res = await POST(req(body));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    expect(mockUpsert).not.toHaveBeenCalled();
    // recovery link generated for the existing owner, attacker's password never used
    expect(mockGenerateLink).toHaveBeenCalledWith({ type: "recovery", email: "victim@firma.pl" });
    expect(mockGenerateLink).not.toHaveBeenCalledWith(expect.objectContaining({ password: expect.anything() }));
    expect(mockSendAccountLink.mock.calls[0][2].kind).toBe("set-password");
  });

  it("falls back to an invite link for a customer that has no auth account yet", async () => {
    mockGetCustomerByEmail.mockResolvedValue({ customer_id: 3, preferred_language: "pl" });
    mockGenerateLink
      .mockResolvedValueOnce({ data: null, error: { message: "User not found" } })
      .mockResolvedValueOnce({ data: { properties: { hashed_token: "inv1" } }, error: null });

    const res = await POST(req(body));
    expect(res.status).toBe(200);
    expect(mockGenerateLink).toHaveBeenLastCalledWith({ type: "invite", email: "victim@firma.pl" });
    expect(mockSendAccountLink.mock.calls[0][2].link).toContain("type=invite");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("answers neutrally when an auth user exists without a customer record", async () => {
    mockGenerateLink
      .mockResolvedValueOnce({ data: null, error: { code: "email_exists", message: "exists" } })
      .mockResolvedValueOnce({ data: { properties: { hashed_token: "rec1" } }, error: null });

    const res = await POST(req(body));
    expect(res.status).toBe(200);
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockSendAccountLink.mock.calls[0][2].kind).toBe("set-password");
  });

  it("validates input and rate limits per email", async () => {
    expect((await POST(req({ email: "a@b.pl", password: "short", name: "x" }))).status).toBe(400);
    for (let i = 0; i < 3; i++) await POST(req(body));
    expect((await POST(req(body))).status).toBe(429);
  });
});
