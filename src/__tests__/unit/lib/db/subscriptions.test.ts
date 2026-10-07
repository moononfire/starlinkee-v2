import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

import { getSubscriptionById, setSubscriptionActive, createSubscription, listSubscriptions } from "@/lib/db/subscriptions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSubscriptionById()", () => {
  it("returns subscription when found", async () => {
    const sub = { subscription_id: 1, status: "active" };
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: sub }),
        })),
      })),
    });

    const result = await getSubscriptionById(1);
    expect(result).toEqual(sub);
  });

  it("returns null when not found", async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null }),
        })),
      })),
    });

    const result = await getSubscriptionById(999);
    expect(result).toBeNull();
  });
});

describe("setSubscriptionActive()", () => {
  it("calls update with status=active and correct dates", async () => {
    const updateMock = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));
    supabaseMock.from.mockReturnValue({ update: updateMock });

    await setSubscriptionActive(5, "2024-01-01T00:00:00.000Z", "2025-01-01T00:00:00.000Z");

    expect(updateMock).toHaveBeenCalledWith({
      status: "active",
      activation_datetime: "2024-01-01T00:00:00.000Z",
      expiration_datetime: "2025-01-01T00:00:00.000Z",
    });
  });

  it("throws when Supabase returns an error", async () => {
    supabaseMock.from.mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: { message: "update failed" } }),
      })),
    });

    await expect(
      setSubscriptionActive(5, "2024-01-01T00:00:00.000Z", "2025-01-01T00:00:00.000Z")
    ).rejects.toThrow("Failed to activate subscription");
  });
});

describe("createSubscription()", () => {
  const input = {
    customer_id: 1,
    subscription_name: "1_YEAR_SUB",
    duration_in_days: 365,
    is_free: false,
  };

  it("inserts with status=pending and returns the created subscription", async () => {
    const sub = { subscription_id: 10, status: "pending", ...input };
    supabaseMock.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: sub, error: null }),
        })),
      })),
    });

    const result = await createSubscription(input);
    expect(result).toEqual(sub);
  });

  it("throws when Supabase returns an error", async () => {
    supabaseMock.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "insert failed" } }),
        })),
      })),
    });

    await expect(createSubscription(input)).rejects.toThrow("Failed to create subscription");
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any */
describe("listSubscriptions()", () => {
  // Mocks: from("customers") -> select -> or -> {data,error}; from("subscriptions") -> select -> order -> (or ->) {data,error}
  function setup(
    opts: { customers?: any[]; customersError?: any; plates?: any[]; platesError?: any; subs?: any[]; subsError?: any } = {}
  ) {
    const customersOr = vi.fn().mockResolvedValue({
      data: opts.customers ?? [],
      error: opts.customersError ?? null,
    });
    const subsResult = { data: opts.subs ?? [], error: opts.subsError ?? null };
    const subsOr = vi.fn().mockResolvedValue(subsResult);
    const order = vi.fn(() => ({ or: subsOr, then: (res: any, rej: any) => Promise.resolve(subsResult).then(res, rej) }));
    const platesNot = vi.fn().mockResolvedValue({
      data: opts.plates ?? [],
      error: opts.platesError ?? null,
    });
    const platesIlike = vi.fn(() => ({ not: platesNot }));
    supabaseMock.from.mockImplementation((table: string) =>
      table === "customers"
        ? { select: vi.fn(() => ({ or: customersOr })) }
        : table === "plates"
          ? { select: vi.fn(() => ({ ilike: platesIlike })) }
          : { select: vi.fn(() => ({ order })) }
    );
    return { customersOr, subsOr, platesIlike, platesNot };
  }

  it.each([undefined, "", "   "])("applies no filter for q=%j", async (q) => {
    const { customersOr, subsOr } = setup();
    await listSubscriptions(q);
    expect(customersOr).not.toHaveBeenCalled();
    expect(subsOr).not.toHaveBeenCalled();
    expect(supabaseMock.from).not.toHaveBeenCalledWith("customers");
  });

  it("searches customers, then filters by plan name or matching customer ids", async () => {
    const { customersOr, subsOr } = setup({ customers: [{ customer_id: 3 }, { customer_id: 7 }] });
    await listSubscriptions("jan");
    expect(customersOr).toHaveBeenCalledWith('customer_name.ilike."%jan%",email.ilike."%jan%"');
    expect(subsOr).toHaveBeenCalledWith('subscription_name.ilike."%jan%",customer_id.in.(3,7)');
  });

  it("omits the customer_id.in clause when no customer matches", async () => {
    const { subsOr } = setup({ customers: [] });
    await listSubscriptions("1_YEAR");
    expect(subsOr).toHaveBeenCalledWith('subscription_name.ilike."%1\\\\_YEAR%"');
  });

  it("quotes and escapes special characters without throwing", async () => {
    const { customersOr, subsOr } = setup();
    await expect(listSubscriptions('a,b(c)%_"\\')).resolves.toEqual([]);
    const expected = '"%a,b(c)\\\\%\\\\_\\"\\\\\\\\%"';
    expect(customersOr).toHaveBeenCalledWith(`customer_name.ilike.${expected},email.ilike.${expected}`);
    expect(subsOr).toHaveBeenCalledWith(`subscription_name.ilike.${expected}`);
  });

  it("throws when the customers lookup fails", async () => {
    setup({ customersError: { message: "boom" } });
    await expect(listSubscriptions("jan")).rejects.toThrow("Failed to list subscriptions");
  });

  it("throws when the subscriptions query fails", async () => {
    setup({ subsError: { message: "boom" } });
    await expect(listSubscriptions("jan")).rejects.toThrow("Failed to list subscriptions");
  });

  it("adds subscription_id.in for assigned plates matching the query", async () => {
    const { subsOr, platesIlike, platesNot } = setup({
      plates: [{ subscription_id: 5 }, { subscription_id: 5 }, { subscription_id: 9 }],
    });
    await listSubscriptions("ab1");
    expect(platesIlike).toHaveBeenCalledWith("plate_number", "%ab1%");
    expect(platesNot).toHaveBeenCalledWith("subscription_id", "is", null);
    expect(subsOr).toHaveBeenCalledWith('subscription_name.ilike."%ab1%",subscription_id.in.(5,9)');
  });

  it("omits subscription_id.in when no plate matches", async () => {
    const { subsOr } = setup({ plates: [] });
    await listSubscriptions("zzz");
    expect(subsOr).toHaveBeenCalledWith('subscription_name.ilike."%zzz%"');
  });

  it("throws when the plates lookup fails", async () => {
    setup({ platesError: { message: "boom" } });
    await expect(listSubscriptions("jan")).rejects.toThrow("Failed to list subscriptions");
  });
});
