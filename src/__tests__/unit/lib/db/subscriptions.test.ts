import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

import { getSubscriptionById, setSubscriptionActive, createSubscription } from "@/lib/db/subscriptions";

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
