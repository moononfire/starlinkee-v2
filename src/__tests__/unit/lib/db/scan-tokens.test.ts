import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn() };
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => supabaseMock }));

import { consumeScanToken } from "@/lib/db/scan-tokens";

beforeEach(() => vi.clearAllMocks());

function mockUpdate(rows: unknown[]) {
  const is = vi.fn(() => ({ select: vi.fn().mockResolvedValue({ data: rows }) }));
  const eq2 = vi.fn(() => ({ is }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const update = vi.fn(() => ({ eq: eq1 }));
  supabaseMock.from.mockReturnValue({ update });
  return { update, is };
}

describe("consumeScanToken()", () => {
  it("spends the token for the purpose only when it was unspent", async () => {
    const { update, is } = mockUpdate([{ id: 1 }]);
    expect(await consumeScanToken("t", 5, "promo")).toBe(true);
    expect(update).toHaveBeenCalledWith({ promo_used_at: expect.any(String) });
    expect(is).toHaveBeenCalledWith("promo_used_at", null);
  });

  it("returns false on replay (no unspent row matched)", async () => {
    mockUpdate([]);
    expect(await consumeScanToken("t", 5, "loyalty")).toBe(false);
  });

  it("tracks purposes independently", async () => {
    const { update } = mockUpdate([{ id: 1 }]);
    await consumeScanToken("t", 5, "loyalty");
    expect(update).toHaveBeenCalledWith({ loyalty_used_at: expect.any(String) });
  });
});
