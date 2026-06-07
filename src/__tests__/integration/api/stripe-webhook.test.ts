import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockProcessInvoicePaymentSucceeded, mockConstructEvent } = vi.hoisted(() => ({
  mockProcessInvoicePaymentSucceeded: vi.fn(),
  mockConstructEvent: vi.fn(),
}));

vi.mock("@/lib/services/stripe", () => ({
  processInvoicePaymentSucceeded: mockProcessInvoicePaymentSucceeded,
}));

vi.mock("stripe", () => ({
  default: vi.fn(function (this: { webhooks: { constructEvent: typeof mockConstructEvent } }) {
    this.webhooks = { constructEvent: mockConstructEvent };
  }),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: vi.fn((fn: () => Promise<void>) => fn()) };
});

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
  mockProcessInvoicePaymentSucceeded.mockResolvedValue(undefined);
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

  it("returns 200 for unknown event types without calling processInvoice", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.created",
      data: { object: {} },
    });

    const res = await POST(makeRequest("{}", "valid-sig"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockProcessInvoicePaymentSucceeded).not.toHaveBeenCalled();
  });

  it("returns 200 and calls processInvoicePaymentSucceeded for invoice.payment_succeeded", async () => {
    const invoice = { id: "in_test123", customer_email: "test@example.com" };
    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_succeeded",
      data: { object: invoice },
    });

    const res = await POST(makeRequest("{}", "valid-sig"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(mockProcessInvoicePaymentSucceeded).toHaveBeenCalledOnce();
    expect(mockProcessInvoicePaymentSucceeded).toHaveBeenCalledWith(invoice);
  });
});
