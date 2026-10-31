import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockRpc = vi.fn();
const mockHead = vi.fn();

function chain(overrides: Record<string, unknown> = {}) {
  const obj: Record<string, unknown> = {
    single: mockSingle,
    eq: vi.fn(() => obj),
    select: vi.fn(() => obj),
    insert: vi.fn(() => obj),
    update: vi.fn(() => obj),
    ...overrides,
  };
  return obj;
}

const supabaseMock = {
  from: vi.fn(),
  rpc: mockRpc,
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

import {
  getPlateByNumber,
  plateExists,
  insertPlatesBatch,
  incrementPlateVisits,
  assignPlateToSubscription,
  unassignPlateFromSubscription,
} from "@/lib/db/plates";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPlateByNumber()", () => {
  it("uppercases the plate number before querying", async () => {
    const eqMock = vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null }) }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    supabaseMock.from.mockReturnValue({ select: selectMock });

    await getPlateByNumber("abc123");

    expect(eqMock).toHaveBeenCalledWith("plate_number", "ABC123");
  });

  it("returns null when plate not found", async () => {
    const eqMock = vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null }) }));
    supabaseMock.from.mockReturnValue({ select: vi.fn(() => ({ eq: eqMock })) });

    const result = await getPlateByNumber("NOTEXIST");
    expect(result).toBeNull();
  });

  it("returns plate data when found", async () => {
    const plate = { plate_id: 1, plate_number: "ABCDEF", secret_key: "secret" };
    const eqMock = vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: plate }) }));
    supabaseMock.from.mockReturnValue({ select: vi.fn(() => ({ eq: eqMock })) });

    const result = await getPlateByNumber("ABCDEF");
    expect(result).toEqual(plate);
  });
});

describe("plateExists()", () => {
  it("returns true when count > 0", async () => {
    const eqMock = vi.fn().mockResolvedValue({ count: 3 });
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    supabaseMock.from.mockReturnValue({ select: selectMock });

    const result = await plateExists("ABCDEF");
    expect(result).toBe(true);
  });

  it("returns false when count is 0", async () => {
    const eqMock = vi.fn().mockResolvedValue({ count: 0 });
    supabaseMock.from.mockReturnValue({ select: vi.fn(() => ({ eq: eqMock })) });

    const result = await plateExists("XXXXXX");
    expect(result).toBe(false);
  });

  it("returns false when count is null", async () => {
    const eqMock = vi.fn().mockResolvedValue({ count: null });
    supabaseMock.from.mockReturnValue({ select: vi.fn(() => ({ eq: eqMock })) });

    const result = await plateExists("XXXXXX");
    expect(result).toBe(false);
  });
});

describe("insertPlatesBatch()", () => {
  it("throws on Supabase error", async () => {
    supabaseMock.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: { message: "duplicate key" } }),
    });

    await expect(
      insertPlatesBatch([{ plate_number: "AAAAAA", plate_language: "en", secret_key: "key" }])
    ).rejects.toThrow("Batch insert failed");
  });

  it("resolves without error on success", async () => {
    supabaseMock.from.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    await expect(
      insertPlatesBatch([{ plate_number: "BBBBBB", plate_language: "de", secret_key: "key2" }])
    ).resolves.toBeUndefined();
  });
});

describe("incrementPlateVisits()", () => {
  it("calls the increment_plate_visits rpc with the plate id", async () => {
    mockRpc.mockResolvedValue({ error: null });
    await incrementPlateVisits(42);
    expect(mockRpc).toHaveBeenCalledWith("increment_plate_visits", { p_plate_id: 42 });
  });

  it("throws when the rpc returns an error", async () => {
    mockRpc.mockResolvedValue({ error: { message: "rpc failed" } });
    await expect(incrementPlateVisits(42)).rejects.toThrow("Failed to increment plate visits");
  });
});

describe("assignPlateToSubscription()", () => {
  // update().eq().is().select() — the conditional write; then an optional re-read of the plate.
  // After a fresh assignment: subscriptions.select().eq().maybeSingle(), then customers.update().eq().is().
  const customersIs = vi.fn().mockResolvedValue({ error: null });
  const customersUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ is: customersIs })) }));
  const venueEq = vi.fn().mockResolvedValue({ error: null });
  const venueUpdate = vi.fn(() => ({ eq: venueEq }));
  let venue: { location_id: number; active_languages: string[] } | null = null;
  beforeEach(() => {
    venue = null;
  });
  function mockAdopt(customer: { customer_id: number } | null) {
    supabaseMock.from.mockReturnValueOnce({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: customer }) })) })),
    });
    if (customer) supabaseMock.from.mockReturnValueOnce({ update: customersUpdate });
    // then the venue of the subscription: customer_locations.select().eq().maybeSingle(), optional .update().eq()
    supabaseMock.from.mockReturnValueOnce({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: venue }) })) })),
    });
    if (venue && !venue.active_languages.includes("de")) supabaseMock.from.mockReturnValueOnce({ update: venueUpdate });
  }

  function mockAssign(
    update: { data: unknown[] | null; error: { message: string } | null },
    plateRow?: { subscription_id: number | null } | null,
    customer: { customer_id: number } | null = { customer_id: 3 }
  ) {
    const isFn = vi.fn(() => ({ select: vi.fn().mockResolvedValue(update) }));
    const updateFn = vi.fn(() => ({ eq: vi.fn(() => ({ is: isFn })) }));
    supabaseMock.from.mockReturnValueOnce({ update: updateFn });
    if (update.data && update.data.length > 0) mockAdopt(customer);
    if (plateRow !== undefined) {
      supabaseMock.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: plateRow, error: null }) })),
        })),
      });
    }
    return { updateFn, isFn };
  }

  it("assigns a free plate, only where subscription_id is still null", async () => {
    const { updateFn, isFn } = mockAssign({ data: [{ plate_id: 7, plate_language: "de" }], error: null });

    await expect(assignPlateToSubscription(7, 50)).resolves.toBe(true);
    expect(updateFn).toHaveBeenCalledWith({ subscription_id: 50 });
    expect(isFn).toHaveBeenCalledWith("subscription_id", null);
  });

  it("gives a customer without a language the plate's language, never overwriting a language that is set", async () => {
    mockAssign({ data: [{ plate_id: 7, plate_language: "de" }], error: null });

    await assignPlateToSubscription(7, 50);

    expect(customersUpdate).toHaveBeenCalledWith({ preferred_language: "de" });
    expect(customersIs).toHaveBeenCalledWith("preferred_language", null); // only while it is still empty
  });

  it("adds the plate's language to the venue's active languages when it is missing", async () => {
    venue = { location_id: 11, active_languages: ["en", "pl"] };
    mockAssign({ data: [{ plate_id: 7, plate_language: "de" }], error: null });

    await assignPlateToSubscription(7, 50);

    expect(venueUpdate).toHaveBeenCalledWith({ active_languages: ["en", "pl", "de"] });
    expect(venueEq).toHaveBeenCalledWith("location_id", 11);
  });

  it("leaves the venue alone when the language is already active or there is no venue yet", async () => {
    venue = { location_id: 11, active_languages: ["en", "de"] };
    mockAssign({ data: [{ plate_id: 7, plate_language: "de" }], error: null });
    await assignPlateToSubscription(7, 50);
    expect(venueUpdate).not.toHaveBeenCalled();

    venue = null;
    mockAssign({ data: [{ plate_id: 7, plate_language: "de" }], error: null });
    await assignPlateToSubscription(7, 50);
    expect(venueUpdate).not.toHaveBeenCalled();
  });

  it("does not touch the customer for an unsupported plate language or an already assigned plate", async () => {
    supabaseMock.from.mockReturnValueOnce({
      update: vi.fn(() => ({ eq: vi.fn(() => ({ is: vi.fn(() => ({ select: vi.fn().mockResolvedValue({ data: [{ plate_id: 7, plate_language: "zh" }], error: null }) })) })) })),
    });
    await assignPlateToSubscription(7, 50);
    expect(customersUpdate).not.toHaveBeenCalled();

    mockAssign({ data: [], error: null }, { subscription_id: 50 });
    await assignPlateToSubscription(7, 50);
    expect(customersUpdate).not.toHaveBeenCalled();
  });

  it("is idempotent: a plate already on this subscription counts as assigned", async () => {
    mockAssign({ data: [], error: null }, { subscription_id: 50 });
    await expect(assignPlateToSubscription(7, 50)).resolves.toBe(true);
  });

  it("returns false when the plate belongs to another subscription (stale form, second window)", async () => {
    mockAssign({ data: [], error: null }, { subscription_id: 99 });
    await expect(assignPlateToSubscription(7, 50)).resolves.toBe(false);
  });

  it("returns false for a plate that does not exist", async () => {
    mockAssign({ data: [], error: null }, null);
    await expect(assignPlateToSubscription(404, 50)).resolves.toBe(false);
  });

  it("throws on a database error instead of swallowing it", async () => {
    mockAssign({ data: null, error: { message: "boom" } });
    await expect(assignPlateToSubscription(7, 50)).rejects.toThrow("Failed to assign plate: boom");
  });
});

describe("unassignPlateFromSubscription()", () => {
  it("clears the plate only if it still belongs to that subscription", async () => {
    const eqSub = vi.fn().mockResolvedValue({ error: null });
    const eqPlate = vi.fn(() => ({ eq: eqSub }));
    const updateFn = vi.fn(() => ({ eq: eqPlate }));
    supabaseMock.from.mockReturnValueOnce({ update: updateFn });

    await unassignPlateFromSubscription(7, 50);

    expect(updateFn).toHaveBeenCalledWith({ subscription_id: null });
    expect(eqPlate).toHaveBeenCalledWith("plate_id", 7);
    expect(eqSub).toHaveBeenCalledWith("subscription_id", 50);
  });
});
