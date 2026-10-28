import { describe, it, expect, vi, beforeEach } from "vitest";

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => supabaseMock }));

import { consumeSmsCredit, MONTHLY_SMS_LIMIT } from "@/lib/sms-quota";

const future = new Date(Date.now() + 86_400_000).toISOString();

/** A customers table whose reads return `reads[i]` and whose conditional update returns `updates[i]` rows. */
function mockCustomers(reads: Array<{ sms_credits_used: number; sms_credits_reset_at: string } | null>, updates: number[]) {
  let r = 0;
  let u = 0;
  const updateCalls: unknown[] = [];
  supabaseMock.from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: reads[Math.min(r++, reads.length - 1)] }) }) }),
    update: (values: unknown) => {
      updateCalls.push(values);
      const eqs: Array<[string, unknown]> = [];
      const chain: Record<string, unknown> = {
        eq: (col: string, val: unknown) => {
          eqs.push([col, val]);
          return chain;
        },
        select: () => Promise.resolve({ data: Array.from({ length: updates[u++] ?? 0 }, () => ({ customer_id: 1 })), error: null, eqs }),
      };
      return chain;
    },
  }));
  return updateCalls;
}

beforeEach(() => vi.clearAllMocks());

describe("consumeSmsCredit()", () => {
  it("consumes a credit when the guarded update matches", async () => {
    const calls = mockCustomers([{ sms_credits_used: 3, sms_credits_reset_at: future }], [1]);
    expect(await consumeSmsCredit(1)).toBe(true);
    expect(calls[0]).toEqual({ sms_credits_used: 4 });
  });

  it("refuses at the monthly limit without writing", async () => {
    const calls = mockCustomers([{ sms_credits_used: MONTHLY_SMS_LIMIT, sms_credits_reset_at: future }], [1]);
    expect(await consumeSmsCredit(1)).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("re-reads and retries when a concurrent consumer changed the counter", async () => {
    const calls = mockCustomers(
      [
        { sms_credits_used: 98, sms_credits_reset_at: future },
        { sms_credits_used: 99, sms_credits_reset_at: future },
      ],
      [0, 1]
    );
    expect(await consumeSmsCredit(1)).toBe(true);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual({ sms_credits_used: 100 });
  });

  it("does not overshoot: after losing the race at 99 the next read shows the limit", async () => {
    mockCustomers(
      [
        { sms_credits_used: 99, sms_credits_reset_at: future },
        { sms_credits_used: 100, sms_credits_reset_at: future },
      ],
      [0, 0]
    );
    expect(await consumeSmsCredit(1)).toBe(false);
  });

  it("returns false for an unknown customer", async () => {
    mockCustomers([null], [0]);
    expect(await consumeSmsCredit(1)).toBe(false);
  });
});
