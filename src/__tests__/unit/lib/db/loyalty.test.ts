import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

import { getLoyaltyCard, createLoyaltyCard, incrementStamp, resetLoyaltyCard } from "@/lib/db/loyalty";

const USER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => vi.clearAllMocks());

describe("getLoyaltyCard()", () => {
  it("returns null when not found", async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null }) })) })),
      })),
    });
    const result = await getLoyaltyCard(1, USER_ID);
    expect(result).toBeNull();
  });

  it("returns card when found", async () => {
    const card = { id: 5, location_id: 1, customer_user_id: USER_ID, stamps_count: 3, last_stamp_at: null };
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: card }) })) })),
      })),
    });
    const result = await getLoyaltyCard(1, USER_ID);
    expect(result).toEqual(card);
  });
});

describe("createLoyaltyCard()", () => {
  it("throws on error", async () => {
    supabaseMock.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: { message: "unique constraint" } }) })),
      })),
    });
    await expect(createLoyaltyCard(1, USER_ID)).rejects.toThrow("Failed to create loyalty card");
  });

  it("returns created card", async () => {
    const card = { id: 1, location_id: 1, customer_user_id: USER_ID, stamps_count: 1, last_stamp_at: new Date().toISOString() };
    supabaseMock.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: card, error: null }) })),
      })),
    });
    const result = await createLoyaltyCard(1, USER_ID);
    expect(result.stamps_count).toBe(1);
  });
});

describe("incrementStamp()", () => {
  it("increments stamps_count by 1", async () => {
    const fetchSingle = vi.fn().mockResolvedValue({ data: { stamps_count: 4 }, error: null });
    const updatedCard = { id: 1, stamps_count: 5, last_stamp_at: new Date().toISOString() };
    const updateSingle = vi.fn().mockResolvedValue({ data: updatedCard, error: null });

    supabaseMock.from
      .mockReturnValueOnce({
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: fetchSingle })) })),
      })
      .mockReturnValueOnce({
        update: vi.fn(() => ({ eq: vi.fn(() => ({ select: vi.fn(() => ({ single: updateSingle })) })) })),
      });

    const result = await incrementStamp(1);
    expect(result.stamps_count).toBe(5);
  });

  it("throws when fetch fails", async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }) })),
      })),
    });
    await expect(incrementStamp(99)).rejects.toThrow("Failed to fetch loyalty card");
  });
});

describe("resetLoyaltyCard()", () => {
  it("resolves on success", async () => {
    supabaseMock.from.mockReturnValue({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    });
    await expect(resetLoyaltyCard(1)).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    supabaseMock.from.mockReturnValue({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: { message: "fail" } }) })),
    });
    await expect(resetLoyaltyCard(1)).rejects.toThrow("Failed to reset loyalty card");
  });
});
