import { describe, it, expect, vi, beforeEach } from "vitest";

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => supabaseMock }));

import { claimStripeEvent } from "@/lib/db/stripe-events";

beforeEach(() => vi.clearAllMocks());

function mockTable(insertResult: unknown, retryResult?: unknown) {
  const select = vi.fn().mockResolvedValue(retryResult);
  const orFn = vi.fn(() => ({ select }));
  const eq = vi.fn(() => ({ or: orFn }));
  supabaseMock.from.mockReturnValue({
    insert: vi.fn().mockResolvedValue(insertResult),
    update: vi.fn(() => ({ eq })),
  });
  return { orFn };
}

describe("claimStripeEvent()", () => {
  it("claims a new event", async () => {
    mockTable({ error: null });
    expect(await claimStripeEvent("evt_1")).toBe("claimed");
  });

  it("reports a duplicate when the event is done or being processed", async () => {
    mockTable({ error: { code: "23505", message: "dup" } }, { data: [], error: null });
    expect(await claimStripeEvent("evt_1")).toBe("duplicate");
  });

  it("re-claims a failed or stale event, only matching failed/stale rows", async () => {
    const { orFn } = mockTable({ error: { code: "23505", message: "dup" } }, { data: [{ event_id: "evt_1" }], error: null });
    expect(await claimStripeEvent("evt_1")).toBe("claimed");
    expect(orFn.mock.calls[0][0]).toContain("status.eq.failed");
    expect(orFn.mock.calls[0][0]).toContain("status.eq.processing");
  });

  it("throws on unexpected database errors", async () => {
    mockTable({ error: { code: "XX000", message: "boom" } });
    await expect(claimStripeEvent("evt_1")).rejects.toThrow("Failed to claim Stripe event");
  });
});
