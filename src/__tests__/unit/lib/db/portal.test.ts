/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

import {
  getAllReviewsBySubscription,
  getPlateStatsBySubscription,
  getCustomerByEmail,
  getCustomerSubscriptions,
} from "@/lib/db/portal";

beforeEach(() => {
  vi.clearAllMocks();
});

// Reviews (and their stats) belong to the subscription they were created under (reviews.subscription_id),
// not to whichever subscription the plate is on today (F12).
describe("getAllReviewsBySubscription()", () => {
  function setup(opts: { reviews?: any[]; reviewsError?: any }) {
    const order = vi.fn().mockResolvedValue({ data: opts.reviews ?? [], error: opts.reviewsError ?? null });
    const not = vi.fn(() => ({ order }));
    const eq = vi.fn(() => ({ not }));
    const select = vi.fn(() => ({ eq }));
    supabaseMock.from.mockReturnValue({ select });
    return { select, eq, not, order };
  }

  it("selects reviews by their own subscription_id, with a rating, newest first, plate number joined", async () => {
    const m = setup({
      reviews: [
        { review_id: 10, plate_id: 2, rating: 5, plates: { plate_number: "BBB222" } },
        { review_id: 11, plate_id: 1, rating: 3, plates: { plate_number: "AAA111" } },
      ],
    });

    const result = await getAllReviewsBySubscription(7);

    expect(supabaseMock.from).toHaveBeenCalledOnce();
    expect(supabaseMock.from).toHaveBeenCalledWith("reviews");
    expect(m.select).toHaveBeenCalledWith("*, plates(plate_number)");
    expect(m.eq).toHaveBeenCalledWith("subscription_id", 7);
    expect(m.not).toHaveBeenCalledWith("rating", "is", null);
    expect(m.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual([
      { review_id: 10, plate_id: 2, rating: 5, plate_number: "BBB222" },
      { review_id: 11, plate_id: 1, rating: 3, plate_number: "AAA111" },
    ]);
  });

  it("still returns the reviews of a subscription whose plates have all moved away", async () => {
    setup({ reviews: [{ review_id: 12, plate_id: 9, rating: 4, plates: { plate_number: "OLD999" } }] });

    expect(await getAllReviewsBySubscription(7)).toEqual([
      { review_id: 12, plate_id: 9, rating: 4, plate_number: "OLD999" },
    ]);
  });

  it("returns [] when there are none and throws when the query fails", async () => {
    setup({ reviews: [] });
    expect(await getAllReviewsBySubscription(7)).toEqual([]);

    setup({ reviewsError: { message: "boom" } });
    await expect(getAllReviewsBySubscription(7)).rejects.toThrow("Failed to load reviews");
  });
});

describe("getPlateStatsBySubscription()", () => {
  function setup(opts: { plates?: any[] | null; platesError?: any; reviews?: any[]; reviewsError?: any }) {
    const platesEq = vi.fn().mockResolvedValue({ data: opts.plates ?? null, error: opts.platesError ?? null });
    const platesSelect = vi.fn(() => ({ eq: platesEq }));
    const reviewsEq = vi.fn().mockResolvedValue({ data: opts.reviews ?? [], error: opts.reviewsError ?? null });
    const reviewsSelect = vi.fn(() => ({ eq: reviewsEq }));
    supabaseMock.from.mockImplementation((table: string) =>
      table === "plates" ? { select: platesSelect } : { select: reviewsSelect }
    );
    return { platesSelect, platesEq, reviewsSelect, reviewsEq };
  }

  it("sums number_of_visits + scan_count_offset over the plates; review visits come from reviews.subscription_id", async () => {
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
    expect(m.reviewsSelect).toHaveBeenCalledWith("plate_id");
    expect(m.reviewsEq).toHaveBeenCalledWith("subscription_id", 9);
    expect(result.scans).toEqual({ total: 11, byPlate: { 1: 7, 2: 0, 3: 4 } });
    expect(result.reviewVisits).toEqual({ total: 3, byPlate: { 1: 2, 2: 0, 3: 1 } });
  });

  it("counts visits of a plate that has since moved in the total, but not per current plate", async () => {
    setup({
      plates: [{ plate_id: 1, number_of_visits: 1, scan_count_offset: 0 }],
      reviews: [{ plate_id: 1 }, { plate_id: 77 }],
    });

    const result = await getPlateStatsBySubscription(9);

    expect(result.reviewVisits).toEqual({ total: 2, byPlate: { 1: 1 } });
  });

  it("returns zeros when there are neither plates nor reviews", async () => {
    setup({ plates: [], reviews: [] });
    expect(await getPlateStatsBySubscription(9)).toEqual({
      scans: { total: 0, byPlate: {} },
      reviewVisits: { total: 0, byPlate: {} },
    });
  });

  it("throws when the plates or the reviews query fails", async () => {
    setup({ platesError: { message: "boom" } });
    await expect(getPlateStatsBySubscription(9)).rejects.toThrow("Failed to count scans");

    setup({ plates: [{ plate_id: 1, number_of_visits: 0, scan_count_offset: 0 }], reviewsError: { message: "boom" } });
    await expect(getPlateStatsBySubscription(9)).rejects.toThrow("Failed to count scans");
  });
});

describe("getCustomerByEmail()", () => {
  const lookup = (rows: any[]) => {
    const ilike = vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: rows }) }));
    supabaseMock.from.mockReturnValue({ select: vi.fn(() => ({ ilike })) });
    return ilike;
  };

  it("matches case-insensitively on the trimmed, lowercased address (oldest row wins)", async () => {
    const ilike = lookup([
      { customer_id: 5, email: "Jan@Firma.PL" },
      { customer_id: 9, email: "jan@firma.pl" },
    ]);

    const customer = await getCustomerByEmail(" Jan@Firma.PL ");

    expect(customer).toMatchObject({ customer_id: 5 });
    expect(ilike).toHaveBeenCalledWith("email", "jan@firma.pl");
  });

  it("returns null when nothing matches", async () => {
    lookup([]);
    expect(await getCustomerByEmail("nobody@x.com")).toBeNull();
  });

  it("does not return another customer matched only through a wildcard", async () => {
    const ilike = lookup([{ customer_id: 1, email: "victim@evil.com" }]);

    expect(await getCustomerByEmail("*@evil.com")).toBeNull();
    expect(ilike).toHaveBeenCalledWith("email", "_@evil.com");
  });
});

describe("getCustomerSubscriptions() — expiry before the nightly cron (F14)", () => {
  function rows(list: any[]) {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: list, error: null }) })),
      })),
    });
  }
  const day = 86_400_000;

  it("shows an active subscription with a past end date as inactive", async () => {
    rows([
      { subscription_id: 1, status: "active", expiration_datetime: new Date(Date.now() - day).toISOString() },
      { subscription_id: 2, status: "active", expiration_datetime: new Date(Date.now() + day).toISOString() },
      { subscription_id: 3, status: "active", expiration_datetime: null },
      { subscription_id: 4, status: "pending", expiration_datetime: new Date(Date.now() - day).toISOString() },
    ]);

    const subs = await getCustomerSubscriptions(1);

    expect(subs.map((s) => s.status)).toEqual(["inactive", "active", "active", "pending"]);
  });
});
