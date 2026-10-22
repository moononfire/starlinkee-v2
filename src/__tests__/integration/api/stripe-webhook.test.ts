import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockProcessStripeInvoice, mockConstructEvent, mockClaim, mockDone, mockFailed } = vi.hoisted(() => ({
  mockProcessStripeInvoice: vi.fn(),
  mockConstructEvent: vi.fn(),
  mockClaim: vi.fn(),
  mockDone: vi.fn(),
  mockFailed: vi.fn(),
}));

vi.mock("@/lib/services/stripe", () => ({
  processStripeInvoice: mockProcessStripeInvoice,
}));
vi.mock("@/lib/db/stripe-events", () => ({
  claimStripeEvent: mockClaim,
  markStripeEventDone: mockDone,
  markStripeEventFailed: mockFailed,
}));

vi.mock("stripe", () => ({
  default: vi.fn(function (this: { webhooks: { constructEvent: typeof mockConstructEvent } }) {
    this.webhooks = { constructEvent: mockConstructEvent };
  }),
}));

import { POST } from "@/app/api/stripe/webhook/route";

function makeRequest(body: string, signature?: string) {
  const headers: Record<string, string> = { "content-type": "text/plain" };
  if (signature !== undefined) headers["stripe-signature"] = signature;
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = "sk_test_key";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  mockProcessStripeInvoice.mockResolvedValue(undefined);
  mockClaim.mockResolvedValue("claimed");
  mockDone.mockResolvedValue(undefined);
  mockFailed.mockResolvedValue(undefined);
});

describe("POST /api/stripe/webhook", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("stripe-signature");
  });

  it("returns 400 when signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });

    const res = await POST(makeRequest("{}", "bad-signature"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("No signatures found");
  });

  it("returns 200 for unknown event types without claiming or processing", async () => {
    mockConstructEvent.mockReturnValue({ id: "evt_1", type: "customer.created", data: { object: {} } });

    const res = await POST(makeRequest("{}", "valid-sig"));
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
    expect(mockClaim).not.toHaveBeenCalled();
    expect(mockProcessStripeInvoice).not.toHaveBeenCalled();
  });

  it("processes invoice.payment_succeeded synchronously and marks the event done", async () => {
    const invoice = { id: "in_test123", customer_email: "test@example.com" };
    mockConstructEvent.mockReturnValue({ id: "evt_1", type: "invoice.payment_succeeded", data: { object: invoice } });

    const res = await POST(makeRequest("{}", "valid-sig"));
    expect(res.status).toBe(200);
    expect(mockClaim).toHaveBeenCalledWith("evt_1");
    expect(mockProcessStripeInvoice).toHaveBeenCalledWith(invoice);
    expect(mockDone).toHaveBeenCalledWith("evt_1");
  });

  it("does not process a redelivered event twice", async () => {
    mockClaim.mockResolvedValue("duplicate");
    mockConstructEvent.mockReturnValue({ id: "evt_1", type: "invoice.payment_succeeded", data: { object: { id: "in_1" } } });

    const res = await POST(makeRequest("{}", "valid-sig"));
    expect(res.status).toBe(200);
    expect(mockProcessStripeInvoice).not.toHaveBeenCalled();
    expect(mockDone).not.toHaveBeenCalled();
  });

  it("returns 500 and marks the event failed when processing throws, so Stripe retries", async () => {
    mockProcessStripeInvoice.mockRejectedValue(new Error("db down"));
    mockConstructEvent.mockReturnValue({ id: "evt_1", type: "invoice.payment_succeeded", data: { object: { id: "in_1" } } });

    const res = await POST(makeRequest("{}", "valid-sig"));
    expect(res.status).toBe(500);
    expect(mockFailed).toHaveBeenCalledWith("evt_1", "db down");
    expect(mockDone).not.toHaveBeenCalled();
  });
});
