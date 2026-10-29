import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSession, mockCancel } = vi.hoisted(() => ({ mockSession: vi.fn(), mockCancel: vi.fn() }));

vi.mock("@/lib/portal-session", () => ({ getPortalSession: mockSession }));
vi.mock("@/lib/services/stripe-cancel", () => ({ cancelRenewalAtPeriodEnd: mockCancel }));

import { POST } from "@/app/api/portal/subscription/cancel/route";

const sub = (over: object = {}) => ({
  subscription_id: 7,
  status: "active",
  stripe_subscription_id: "sub_stripe_7",
  cancel_at_period_end: false,
  ...over,
});
const req = (body: unknown, headers: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/portal/subscription/cancel", {
    method: "POST",
    body: JSON.stringify(body),
    headers,
  });
const session = (subscriptions: object[]) =>
  mockSession.mockResolvedValue({ user: { id: "u" }, customer: { customer_id: 1 }, subscriptions });

beforeEach(() => {
  vi.clearAllMocks();
  mockCancel.mockResolvedValue(undefined);
  session([sub()]);
});

describe("POST /api/portal/subscription/cancel", () => {
  it("cancels the renewal of the owner's Stripe subscription", async () => {
    const res = await POST(req({ subscriptionId: 7 }));
    expect(res.status).toBe(200);
    expect(mockCancel).toHaveBeenCalledWith("sub_stripe_7");
  });

  it("401 without a portal session", async () => {
    mockSession.mockResolvedValue({ user: null, customer: null, subscriptions: [] });
    expect((await POST(req({ subscriptionId: 7 }))).status).toBe(401);
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it("403 for somebody else's subscription", async () => {
    expect((await POST(req({ subscriptionId: 8 }))).status).toBe(403);
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it("403 for a cross-origin request", async () => {
    expect((await POST(req({ subscriptionId: 7 }, { origin: "https://evil.example" }))).status).toBe(403);
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it("400 when there is no Stripe subscription (one-off or manual) or it is not active", async () => {
    session([sub({ stripe_subscription_id: null })]);
    expect((await POST(req({ subscriptionId: 7 }))).status).toBe(400);
    session([sub({ status: "inactive" })]);
    expect((await POST(req({ subscriptionId: 7 }))).status).toBe(400);
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it("is idempotent: already cancelling -> 200 without calling Stripe again", async () => {
    session([sub({ cancel_at_period_end: true })]);
    expect((await POST(req({ subscriptionId: 7 }))).status).toBe(200);
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it("502 when Stripe fails, so the UI can say it did not work", async () => {
    mockCancel.mockRejectedValue(new Error("stripe down"));
    expect((await POST(req({ subscriptionId: 7 }))).status).toBe(502);
  });
});
