import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

import {
  getLoyaltyCard,
  createLoyaltyCard,
  incrementStamp,
  getLoyaltyCardByRedeemCode,
  setRedeemCode,
  clearRedeemCode,
  confirmRedemption,
  upsertOtp,
  getOtp,
  deleteOtp,
} from "@/lib/db/loyalty";

beforeEach(() => vi.clearAllMocks());

describe("getLoyaltyCard()", () => {
  it("returns null when not found", async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null }) })) })),
      })),
    });
    const result = await getLoyaltyCard(1, "+48600000000");
    expect(result).toBeNull();
  });

  it("returns card when found", async () => {
    const card = { id: 5, location_id: 1, phone: "+48600000000", stamps_count: 3, last_stamp_at: null };
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: card }) })) })),
      })),
    });
    const result = await getLoyaltyCard(1, "+48600000000");
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
    await expect(createLoyaltyCard(1, "+48600000000")).rejects.toThrow("Failed to create loyalty card");
  });

  it("returns created card", async () => {
    const card = { id: 1, location_id: 1, phone: "+48600000000", stamps_count: 1, last_stamp_at: new Date().toISOString() };
    supabaseMock.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: card, error: null }) })),
      })),
    });
    const result = await createLoyaltyCard(1, "+48600000000");
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

describe("getLoyaltyCardByRedeemCode()", () => {
  it("returns null when not found", async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null }) })) })),
    });
    const result = await getLoyaltyCardByRedeemCode("ABCD1234");
    expect(result).toBeNull();
  });

  it("returns card when found", async () => {
    const card = { id: 5, redeem_code: "ABCD1234" };
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: card }) })) })),
    });
    const result = await getLoyaltyCardByRedeemCode("ABCD1234");
    expect(result).toEqual(card);
  });
});

describe("setRedeemCode()", () => {
  it("resolves on success", async () => {
    supabaseMock.from.mockReturnValue({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    });
    await expect(setRedeemCode(1, "ABCD1234", new Date().toISOString())).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    supabaseMock.from.mockReturnValue({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: { message: "fail" } }) })),
    });
    await expect(setRedeemCode(1, "ABCD1234", new Date().toISOString())).rejects.toThrow("Failed to set redeem code");
  });
});

describe("clearRedeemCode()", () => {
  it("resolves on success", async () => {
    supabaseMock.from.mockReturnValue({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    });
    await expect(clearRedeemCode(1)).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    supabaseMock.from.mockReturnValue({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: { message: "fail" } }) })),
    });
    await expect(clearRedeemCode(1)).rejects.toThrow("Failed to clear redeem code");
  });
});

describe("confirmRedemption()", () => {
  it("resolves on success", async () => {
    supabaseMock.from.mockReturnValue({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    });
    await expect(confirmRedemption(1)).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    supabaseMock.from.mockReturnValue({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: { message: "fail" } }) })),
    });
    await expect(confirmRedemption(1)).rejects.toThrow("Failed to confirm redemption");
  });
});

describe("upsertOtp()", () => {
  it("throws on error", async () => {
    supabaseMock.from.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: { message: "conflict" } }),
    });
    await expect(upsertOtp("+48600000000", "1234", new Date())).rejects.toThrow("Failed to upsert OTP");
  });

  it("resolves on success", async () => {
    supabaseMock.from.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });
    await expect(upsertOtp("+48600000000", "5678", new Date())).resolves.toBeUndefined();
  });
});

describe("getOtp()", () => {
  it("returns null when not found", async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null }) })),
      })),
    });
    const result = await getOtp("+48600000000");
    expect(result).toBeNull();
  });
});

describe("deleteOtp()", () => {
  it("calls delete without throwing", async () => {
    supabaseMock.from.mockReturnValue({ delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({}) })) });
    await expect(deleteOtp("+48600000000")).resolves.toBeUndefined();
  });
});
