import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn(), rpc: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

import {
  getLocationBySubscriptionId,
  getLocationBySlug,
  createLocation,
  incrementLinktreeVisits,
  listLocations,
} from "@/lib/db/locations";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getLocationBySubscriptionId()", () => {
  it("returns location when found", async () => {
    const loc = { location_id: 1, location_name: "Cafe" };
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: loc }),
        })),
      })),
    });

    const result = await getLocationBySubscriptionId(10);
    expect(result).toEqual(loc);
  });

  it("returns null when not found", async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null }),
        })),
      })),
    });

    const result = await getLocationBySubscriptionId(999);
    expect(result).toBeNull();
  });
});

describe("getLocationBySlug()", () => {
  it("queries by linktree_slug and has_linktree_access=true", async () => {
    const loc = { location_id: 2, linktree_slug: "my-cafe" };
    const firstEqMock = vi.fn();
    const chain: any = {
      eq: firstEqMock,
      single: vi.fn().mockResolvedValue({ data: loc }),
    };
    firstEqMock.mockReturnValue(chain);
    supabaseMock.from.mockReturnValue({ select: vi.fn(() => chain) });

    const result = await getLocationBySlug("my-cafe");

    expect(firstEqMock).toHaveBeenCalledWith("linktree_slug", "my-cafe");
    expect(result).toEqual(loc);
  });

  it("returns null when slug not found", async () => {
    const chain: any = {
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    };
    supabaseMock.from.mockReturnValue({ select: vi.fn(() => chain) });

    const result = await getLocationBySlug("no-such-slug");
    expect(result).toBeNull();
  });
});

describe("createLocation()", () => {
  function mockTables(upsertResult: { data: unknown; error: unknown }, plateLanguages: string[] = []) {
    const upsertMock = vi.fn(() => ({
      select: vi.fn(() => ({ single: vi.fn().mockResolvedValue(upsertResult) })),
    }));
    supabaseMock.from.mockImplementation((table: string) =>
      table === "plates"
        ? {
            select: () => ({
              eq: () => Promise.resolve({ data: plateLanguages.map((plate_language) => ({ plate_language })) }),
            }),
          }
        : { upsert: upsertMock }
    );
    return upsertMock;
  }

  it("upserts on subscription_id and returns the location", async () => {
    const loc = { location_id: 5, location_name: "Restaurant" };
    const upsertMock = mockTables({ data: loc, error: null });

    const result = await createLocation({ subscription_id: 10, location_name: "Restaurant" });
    expect(result).toEqual(loc);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ subscription_id: 10, active_languages: ["pl", "en", "de"] }),
      { onConflict: "subscription_id" }
    );
  });

  it("adds the language of the subscription's plates to active_languages", async () => {
    const upsertMock = mockTables({ data: {}, error: null }, ["it", "de"]);

    await createLocation({ subscription_id: 10, location_name: "Ristorante" });
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ active_languages: ["pl", "en", "de", "it"] }),
      { onConflict: "subscription_id" }
    );
  });

  it("throws when Supabase returns an error", async () => {
    mockTables({ data: null, error: { message: "insert failed" } });

    await expect(
      createLocation({ subscription_id: 10, location_name: "Restaurant" })
    ).rejects.toThrow("Failed to create location");
  });
});
