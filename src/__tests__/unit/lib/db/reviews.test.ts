import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

import { updateRating, updateFeedback, getReviewByScanId } from "@/lib/db/reviews";

beforeEach(() => vi.clearAllMocks());

describe("updateRating()", () => {
  it("throws when scan not found", async () => {
    // select → eq → single returns null data
    const singleSelect = vi.fn().mockResolvedValue({ data: null });
    const eqSelect = vi.fn(() => ({ single: singleSelect }));
    supabaseMock.from.mockReturnValue({ select: vi.fn(() => ({ eq: eqSelect })) });

    await expect(updateRating("bad-scan", 4)).rejects.toThrow("Scan not found");
  });

  it("throws when rating already submitted", async () => {
    const singleSelect = vi.fn().mockResolvedValue({ data: { rating: 5 } });
    const eqSelect = vi.fn(() => ({ single: singleSelect }));
    supabaseMock.from.mockReturnValue({ select: vi.fn(() => ({ eq: eqSelect })) });

    await expect(updateRating("scan-1", 3)).rejects.toThrow("Rating already submitted");
  });

  it("updates when rating is null", async () => {
    const singleSelect = vi.fn().mockResolvedValue({ data: { rating: null } });
    const eqUpdate = vi.fn().mockResolvedValue({ error: null });
    const updateFn = vi.fn(() => ({ eq: eqUpdate }));

    supabaseMock.from
      .mockReturnValueOnce({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single: singleSelect })) })) })
      .mockReturnValueOnce({ update: updateFn });

    await expect(updateRating("scan-1", 4)).resolves.toBeUndefined();
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ rating: 4 }));
  });

  it("throws when Supabase update returns error", async () => {
    const singleSelect = vi.fn().mockResolvedValue({ data: { rating: null } });
    const eqUpdate = vi.fn().mockResolvedValue({ error: { message: "DB error" } });
    const updateFn = vi.fn(() => ({ eq: eqUpdate }));

    supabaseMock.from
      .mockReturnValueOnce({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single: singleSelect })) })) })
      .mockReturnValueOnce({ update: updateFn });

    await expect(updateRating("scan-1", 4)).rejects.toThrow("Failed to update rating");
  });
});

describe("getReviewByScanId()", () => {
  it("returns null when not found", async () => {
    const singleFn = vi.fn().mockResolvedValue({ data: null });
    const eqFn = vi.fn(() => ({ single: singleFn }));
    supabaseMock.from.mockReturnValue({ select: vi.fn(() => ({ eq: eqFn })) });

    const result = await getReviewByScanId("missing");
    expect(result).toBeNull();
  });

  it("returns review when found", async () => {
    const review = { review_id: 1, scan_id: "abc", rating: null };
    const singleFn = vi.fn().mockResolvedValue({ data: review });
    const eqFn = vi.fn(() => ({ single: singleFn }));
    supabaseMock.from.mockReturnValue({ select: vi.fn(() => ({ eq: eqFn })) });

    const result = await getReviewByScanId("abc");
    expect(result).toEqual(review);
  });
});

describe("updateFeedback()", () => {
  it("throws when Supabase returns error", async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: { message: "constraint" } });
    supabaseMock.from.mockReturnValue({ update: vi.fn(() => ({ eq: eqFn })) });

    await expect(
      updateFeedback("scan-1", { feedback_message: "bad service" })
    ).rejects.toThrow("Failed to update feedback");
  });

  it("resolves on success", async () => {
    const eqFn = vi.fn().mockResolvedValue({ error: null });
    supabaseMock.from.mockReturnValue({ update: vi.fn(() => ({ eq: eqFn })) });

    await expect(
      updateFeedback("scan-1", { feedback_message: "great place", user_name: "Jan" })
    ).resolves.toBeUndefined();
  });
});
