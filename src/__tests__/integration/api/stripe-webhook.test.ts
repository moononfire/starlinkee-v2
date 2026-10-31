import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSubEvent, mockProcessPi, mockProcessStripeInvoice, mockConstructEvent, mockClaim, mockDone, mockFailed } = vi.hoisted(() => ({
  mockSubEvent: vi.fn(),
  mockProcessPi: vi.fn(),
  mockProcessStripeInvoice: vi.fn(),
  mockConstructEvent: vi.fn(),
  mockClaim: vi.fn(),
  mockDone: vi.fn(),
  mockFailed: vi.fn(),
}));

vi.mock("@/lib/services/stripe", () => ({
  processStripeInvoice: mockProcessStripeInvoice,
  processExtraPlatesPaymentIntent: mockProcessPi,
  isExtraPlatesPaymentIntent: (pi: { metadata?: { purpose?: string } }) => pi.metadata?.purpose === "extra_plates_and_shipping",
}));
vi.mock("@/lib/services/stripe-cancel", () => ({ processStripeSubscriptionEvent: mockSubEvent }));
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
  mockProcessPi.mockResolvedValue(undefined);
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

  it("acknowledges (200) a redelivery of an event that is already done, without processing", async () => {
    mockClaim.mockResolvedValue("done");
    mockConstructEvent.mockReturnValue({ id: "evt_1", type: "invoice.payment_succeeded", data: { object: { id: "in_1" } } });

    const res = await POST(makeRequest("{}", "valid-sig"));
    expect(res.status).toBe(200);
    expect(mockProcessStripeInvoice).not.toHaveBeenCalled();
    expect(mockDone).not.toHaveBeenCalled();
  });

  it("does NOT acknowledge a delivery that arrives while the first attempt is still processing (409 so Stripe retries)", async () => {
    mockClaim.mockResolvedValue("in_progress");
    mockConstructEvent.mockReturnValue({ id: "evt_1", type: "invoice.payment_succeeded", data: { object: { id: "in_1" } } });

    const res = await POST(makeRequest("{}", "valid-sig"));
    expect(res.status).toBe(409);
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

  it.each(["customer.subscription.updated", "customer.subscription.deleted"])("syncs %s without claiming an invoice event", async (type) => {
    const event = { id: "evt_s", type, data: { object: { id: "sub_1" } } };
    mockConstructEvent.mockReturnValue(event);
    const res = await POST(makeRequest("{}", "sig"));
    expect(res.status).toBe(200);
    expect(mockSubEvent).toHaveBeenCalledWith(event);
    expect(mockClaim).not.toHaveBeenCalled();
    expect(mockProcessStripeInvoice).not.toHaveBeenCalled();
  });

  it("answers 500 when the subscription sync fails so Stripe retries", async () => {
    mockConstructEvent.mockReturnValue({ id: "evt_s", type: "customer.subscription.updated", data: { object: { id: "sub_1" } } });
    mockSubEvent.mockRejectedValue(new Error("db down"));
    const res = await POST(makeRequest("{}", "sig"));
    expect(res.status).toBe(500);
  });
});

describe("payment_intent.succeeded (P28)", () => {
  const piEvent = (metadata: Record<string, string>) => {
    const pi = { id: "pi_1", metadata };
    mockConstructEvent.mockReturnValue({ id: "evt_pi", type: "payment_intent.succeeded", data: { object: pi } });
    return pi;
  };

  it("processes a PaymentIntent with the extra-plates purpose under a claim and marks the event done", async () => {
    const pi = piEvent({ purpose: "extra_plates_and_shipping", subscription_id: "sub_1", extra_plates: "2" });
    const res = await POST(makeRequest("{}", "sig"));
    expect(res.status).toBe(200);
    expect(mockClaim).toHaveBeenCalledWith("evt_pi");
    expect(mockProcessPi).toHaveBeenCalledWith(pi);
    expect(mockProcessStripeInvoice).not.toHaveBeenCalled();
    expect(mockDone).toHaveBeenCalledWith("evt_pi");
  });

  it.each([[{}], [{ purpose: "other" }], [{ subscription_id: "sub_1", extra_plates: "2" }]])(
    "answers 200 and writes nothing for a PaymentIntent without our purpose (%j)",
    async (metadata) => {
      piEvent(metadata);
      const res = await POST(makeRequest("{}", "sig"));
      expect(res.status).toBe(200);
      expect(mockClaim).not.toHaveBeenCalled();
      expect(mockProcessPi).not.toHaveBeenCalled();
    }
  );

  it("answers 500 and marks the event failed when the subscription is not there yet, so Stripe retries", async () => {
    piEvent({ purpose: "extra_plates_and_shipping", subscription_id: "sub_1", extra_plates: "2" });
    mockProcessPi.mockRejectedValue(new Error("not created yet"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest("{}", "sig"));
    expect(res.status).toBe(500);
    expect(mockFailed).toHaveBeenCalledWith("evt_pi", "not created yet");
    expect(mockDone).not.toHaveBeenCalled();
  });

  it("acknowledges a redelivered, already processed PaymentIntent event", async () => {
    piEvent({ purpose: "extra_plates_and_shipping", subscription_id: "sub_1", extra_plates: "2" });
    mockClaim.mockResolvedValue("done");
    const res = await POST(makeRequest("{}", "sig"));
    expect(res.status).toBe(200);
    expect(mockProcessPi).not.toHaveBeenCalled();
  });
});
