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

import { getPlateByNumber, plateExists, insertPlatesBatch } from "@/lib/db/plates";

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
