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

  it("attaches the existing rating to the already-submitted error", async () => {
    const singleSelect = vi.fn().mockResolvedValue({ data: { rating: 5 } });
    const eqSelect = vi.fn(() => ({ single: singleSelect }));
    supabaseMock.from.mockReturnValue({ select: vi.fn(() => ({ eq: eqSelect })) });

    await expect(updateRating("scan-1", 3)).rejects.toMatchObject({ existingRating: 5 });
  });

  // update(...).eq(...).is("rating", null).select(...) — the conditional write that closes the race.
  function mockConditionalUpdate(
    first: { rating: number | null; plates?: { plate_number: string } },
    result: { data: unknown[] | null; error: { message: string } | null },
    afterRace?: { rating: number }
  ) {
    const isFn = vi.fn(() => ({ select: vi.fn().mockResolvedValue(result) }));
    const eqUpdate = vi.fn(() => ({ is: isFn, select: vi.fn().mockResolvedValue(result) }));
    const updateFn = vi.fn(() => ({ eq: eqUpdate }));
    supabaseMock.from
      .mockReturnValueOnce({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: first }) })) })) })
      .mockReturnValueOnce({ update: updateFn });
    if (afterRace) {
      supabaseMock.from.mockReturnValueOnce({
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: afterRace }) })) })),
      });
    }
    return { updateFn, isFn };
  }

  it("updates when rating is null, with a rating-is-null condition", async () => {
    const { updateFn, isFn } = mockConditionalUpdate({ rating: null }, { data: [{ review_id: 1 }], error: null });

    await expect(updateRating("scan-1", 4)).resolves.toBeUndefined();
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ rating: 4 }));
    expect(isFn).toHaveBeenCalledWith("rating", null);
  });

  it("throws when Supabase update returns error", async () => {
    mockConditionalUpdate({ rating: null }, { data: null, error: { message: "DB error" } });

    await expect(updateRating("scan-1", 4)).rejects.toThrow("Failed to update rating");
  });

  it("loses a race: 0 rows updated -> already-submitted with the rating that won", async () => {
    mockConditionalUpdate({ rating: null }, { data: [], error: null }, { rating: 1 });

    await expect(updateRating("scan-1", 5)).rejects.toMatchObject({
      message: "Rating already submitted",
      existingRating: 1,
    });
  });

  it("TJRUAO may be re-rated: no rating-is-null condition", async () => {
    const { isFn } = mockConditionalUpdate(
      { rating: 3, plates: { plate_number: "TJRUAO" } },
      { data: [{ review_id: 1 }], error: null }
    );

    await expect(updateRating("scan-1", 5)).resolves.toBeUndefined();
    expect(isFn).not.toHaveBeenCalled();
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
  function mockUpdate(result: { data?: unknown[] | null; error: { message: string } | null }) {
    const selectFn = vi.fn().mockResolvedValue(result);
    const isFn = vi.fn(() => ({ select: selectFn }));
    supabaseMock.from.mockReturnValue({ update: vi.fn(() => ({ eq: vi.fn(() => ({ is: isFn })) })) });
    return isFn;
  }

  it("throws when Supabase returns error", async () => {
    mockUpdate({ data: null, error: { message: "constraint" } });

    await expect(
      updateFeedback("scan-1", { feedback_message: "bad service" })
    ).rejects.toThrow("Failed to update feedback");
  });

  it("returns true when the first feedback is stored, only touching rows without feedback_time", async () => {
    const isFn = mockUpdate({ data: [{ review_id: 1 }], error: null });

    await expect(
      updateFeedback("scan-1", { feedback_message: "great place", user_name: "Jan" })
    ).resolves.toBe(true);
    expect(isFn).toHaveBeenCalledWith("feedback_time", null);
  });

  it("returns false when feedback was already submitted for the scan", async () => {
    mockUpdate({ data: [], error: null });

    await expect(updateFeedback("scan-1", { feedback_message: "again" })).resolves.toBe(false);
  });
});
