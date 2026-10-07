/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

import { getAllReviewsBySubscription, getPlateStatsBySubscription } from "@/lib/db/portal";

beforeEach(() => {
  vi.clearAllMocks();
});

// Pins the behaviour the analytics tab relies on (portal analytics page): it must not
// change when the scan/review-visit counters change.
describe("getAllReviewsBySubscription()", () => {
  function setup(opts: { plates: any[] | null; reviews?: any[]; reviewsError?: any }) {
    const platesEq = vi.fn().mockResolvedValue({ data: opts.plates });
    const platesSelect = vi.fn(() => ({ eq: platesEq }));
    const order = vi.fn().mockResolvedValue({ data: opts.reviews ?? [], error: opts.reviewsError ?? null });
    const not = vi.fn(() => ({ order }));
    const inFn = vi.fn(() => ({ not }));
    const reviewsSelect = vi.fn(() => ({ in: inFn }));
    supabaseMock.from.mockImplementation((table: string) =>
      table === "plates" ? { select: platesSelect } : { select: reviewsSelect }
    );
    return { platesSelect, platesEq, reviewsSelect, inFn, not, order };
  }

  it("queries plates by subscription_id, then reviews of those plates with a rating", async () => {
    const m = setup({
      plates: [
        { plate_id: 1, plate_number: "AAA111" },
        { plate_id: 2, plate_number: "BBB222" },
      ],
      reviews: [
        { review_id: 10, plate_id: 2, rating: 5 },
        { review_id: 11, plate_id: 1, rating: 3 },
      ],
    });

    const result = await getAllReviewsBySubscription(7);

    expect(supabaseMock.from).toHaveBeenNthCalledWith(1, "plates");
    expect(m.platesSelect).toHaveBeenCalledWith("plate_id, plate_number");
    expect(m.platesEq).toHaveBeenCalledWith("subscription_id", 7);
    expect(supabaseMock.from).toHaveBeenNthCalledWith(2, "reviews");
    expect(m.inFn).toHaveBeenCalledWith("plate_id", [1, 2]);
    expect(m.not).toHaveBeenCalledWith("rating", "is", null);
    expect(m.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual([
      { review_id: 10, plate_id: 2, rating: 5, plate_number: "BBB222" },
      { review_id: 11, plate_id: 1, rating: 3, plate_number: "AAA111" },
    ]);
  });

  it("returns [] without querying reviews when the subscription has no plates", async () => {
    setup({ plates: [] });
    expect(await getAllReviewsBySubscription(7)).toEqual([]);
    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
  });

  it("throws when the reviews query fails", async () => {
    setup({ plates: [{ plate_id: 1, plate_number: "AAA111" }], reviewsError: { message: "boom" } });
    await expect(getAllReviewsBySubscription(7)).rejects.toThrow("Failed to load reviews");
  });
});

describe("getPlateStatsBySubscription()", () => {
  function setup(opts: { plates?: any[] | null; platesError?: any; reviews?: any[]; reviewsError?: any }) {
    const platesEq = vi.fn().mockResolvedValue({ data: opts.plates ?? null, error: opts.platesError ?? null });
    const platesSelect = vi.fn(() => ({ eq: platesEq }));
    const inFn = vi.fn().mockResolvedValue({ data: opts.reviews ?? [], error: opts.reviewsError ?? null });
    const reviewsSelect = vi.fn(() => ({ in: inFn }));
    supabaseMock.from.mockImplementation((table: string) =>
      table === "plates" ? { select: platesSelect } : { select: reviewsSelect }
    );
    return { platesSelect, platesEq, inFn };
  }

  it("sums number_of_visits + scan_count_offset over all plates, and counts reviews separately", async () => {
    const m = setup({
      plates: [
        { plate_id: 1, number_of_visits: 5, scan_count_offset: 2 },
        { plate_id: 2, number_of_visits: 0, scan_count_offset: 0 },
        { plate_id: 3, number_of_visits: 4, scan_count_offset: 0 },
      ],
      reviews: [{ plate_id: 1 }, { plate_id: 1 }, { plate_id: 3 }],
    });

    const result = await getPlateStatsBySubscription(9);

    expect(m.platesSelect).toHaveBeenCalledWith("plate_id, number_of_visits, scan_count_offset");
    expect(m.platesEq).toHaveBeenCalledWith("subscription_id", 9);
    expect(m.inFn).toHaveBeenCalledWith("plate_id", [1, 2, 3]);
    expect(result.scans).toEqual({ total: 11, byPlate: { 1: 7, 2: 0, 3: 4 } });
    expect(result.reviewVisits).toEqual({ total: 3, byPlate: { 1: 2, 2: 0, 3: 1 } });
  });

  it("returns zeros without querying reviews when there are no plates", async () => {
    setup({ plates: [] });
    expect(await getPlateStatsBySubscription(9)).toEqual({
      scans: { total: 0, byPlate: {} },
      reviewVisits: { total: 0, byPlate: {} },
    });
    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
  });

  it("throws when the plates query fails", async () => {
    setup({ platesError: { message: "boom" } });
    await expect(getPlateStatsBySubscription(9)).rejects.toThrow("Failed to count scans");
  });

  it("throws when the reviews query fails", async () => {
    setup({ plates: [{ plate_id: 1, number_of_visits: 1, scan_count_offset: 0 }], reviewsError: { message: "boom" } });
    await expect(getPlateStatsBySubscription(9)).rejects.toThrow("Failed to count scans");
  });
});
