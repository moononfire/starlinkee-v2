import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockPlates, mockCheckout } = vi.hoisted(() => ({
  mockSession: vi.fn(),
  mockPlates: vi.fn(),
  mockCheckout: vi.fn(),
}));

vi.mock("@/lib/portal-session", () => ({ getPortalSession: mockSession }));
vi.mock("@/lib/db/plates", () => ({ getPlatesBySubscriptionId: mockPlates }));
vi.mock("@/lib/services/stripe", () => ({ createRenewalCheckoutSession: mockCheckout }));

import { POST } from "@/app/api/plate/renew/route";

function makeRequest(fields: Record<string, string>, headers: Record<string, string> = {}) {
  const body = new URLSearchParams(fields);
  return new NextRequest("http://localhost/api/plate/renew", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
    body,
  });
}

const owner = {
  user: { email: "owner@example.com" },
  customer: { customer_id: 1, preferred_language: "pl" },
  subscriptions: [
    { subscription_id: 5, status: "inactive" },
    { subscription_id: 6, status: "pending" },
    { subscription_id: 7, status: "active" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.mockResolvedValue(owner);
  mockPlates.mockResolvedValue([{ plate_number: "ABC123", secret_key: "s3cret" }]);
  mockCheckout.mockResolvedValue("https://checkout.stripe.test/session");
});

describe("POST /api/plate/renew", () => {
  it("rejects a request without a portal session (a guest holding the plate secret)", async () => {
    mockSession.mockResolvedValue({ user: null, customer: null, subscriptions: [] });
    const res = await POST(makeRequest({ plateNumber: "ABC123", plateSecret: "s3cret", subscriptionId: "5" }));
    expect(res.status).toBe(401);
    expect(mockCheckout).not.toHaveBeenCalled();
  });

  it("rejects a subscription that belongs to someone else", async () => {
    const res = await POST(makeRequest({ subscriptionId: "99" }));
    expect(res.status).toBe(403);
    expect(mockCheckout).not.toHaveBeenCalled();
  });

  it("rejects a pending subscription", async () => {
    const res = await POST(makeRequest({ subscriptionId: "6" }));
    expect(res.status).toBe(403);
  });

  it("rejects an active subscription (no touching paid time)", async () => {
    const res = await POST(makeRequest({ subscriptionId: "7" }));
    expect(res.status).toBe(403);
    expect(mockCheckout).not.toHaveBeenCalled();
  });

  it("rejects a cross-site form post", async () => {
    const res = await POST(makeRequest({ subscriptionId: "5" }, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(mockCheckout).not.toHaveBeenCalled();
  });

  it("creates a checkout for the owner's subscription and returns to the portal", async () => {
    const res = await POST(makeRequest({ subscriptionId: "5", interval: "year" }, { origin: "http://localhost" }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://checkout.stripe.test/session");
    expect(mockCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: 5,
        plateNumber: "ABC123",
        interval: "year",
        lang: "pl",
        returnUrl: expect.stringMatching(/\/portal\/5$/),
      })
    );
    expect(JSON.stringify(mockCheckout.mock.calls[0][0])).not.toContain("s3cret");
  });
});
