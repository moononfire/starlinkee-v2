import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUpdate, mockSetFlag } = vi.hoisted(() => ({ mockUpdate: vi.fn(), mockSetFlag: vi.fn() }));

vi.mock("stripe", () => ({
  default: vi.fn(function (this: { subscriptions: { update: typeof mockUpdate } }) {
    this.subscriptions = { update: mockUpdate };
  }),
}));
vi.mock("@/lib/db/subscriptions", () => ({ setCancelAtPeriodEnd: mockSetFlag }));

import { cancelRenewalAtPeriodEnd, processStripeSubscriptionEvent } from "@/lib/services/stripe-cancel";
import type Stripe from "stripe";

const event = (type: string, object: object) => ({ type, data: { object } }) as unknown as Stripe.Event;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = "sk_test_key";
  mockUpdate.mockResolvedValue({});
  mockSetFlag.mockResolvedValue(undefined);
});

describe("cancelRenewalAtPeriodEnd()", () => {
  it("asks Stripe to end the subscription with the period (not now) and stores the flag", async () => {
    await cancelRenewalAtPeriodEnd("sub_1");
    expect(mockUpdate).toHaveBeenCalledWith("sub_1", { cancel_at_period_end: true });
    expect(mockSetFlag).toHaveBeenCalledWith("sub_1", true);
  });

  it("does not store the flag when Stripe refuses", async () => {
    mockUpdate.mockRejectedValue(new Error("stripe down"));
    await expect(cancelRenewalAtPeriodEnd("sub_1")).rejects.toThrow("stripe down");
    expect(mockSetFlag).not.toHaveBeenCalled();
  });
});

describe("processStripeSubscriptionEvent()", () => {
  it("updated with cancel_at_period_end=true -> flag on", async () => {
    await processStripeSubscriptionEvent(event("customer.subscription.updated", { id: "sub_1", cancel_at_period_end: true, cancel_at: 1 }));
    expect(mockSetFlag).toHaveBeenCalledWith("sub_1", true);
  });

  it("updated after the owner resumed it (cancel_at_period_end=false) -> flag off", async () => {
    await processStripeSubscriptionEvent(event("customer.subscription.updated", { id: "sub_1", cancel_at_period_end: false, cancel_at: null }));
    expect(mockSetFlag).toHaveBeenCalledWith("sub_1", false);
  });

  it("scheduled by date (cancel_at) counts as ending", async () => {
    await processStripeSubscriptionEvent(event("customer.subscription.updated", { id: "sub_1", cancel_at_period_end: false, cancel_at: 1900000000 }));
    expect(mockSetFlag).toHaveBeenCalledWith("sub_1", true);
  });

  it("deleted -> flag on", async () => {
    await processStripeSubscriptionEvent(event("customer.subscription.deleted", { id: "sub_1", cancel_at_period_end: false, cancel_at: null }));
    expect(mockSetFlag).toHaveBeenCalledWith("sub_1", true);
  });

  it("ignores other events", async () => {
    await processStripeSubscriptionEvent(event("invoice.paid", { id: "in_1" }));
    expect(mockSetFlag).not.toHaveBeenCalled();
  });
});
