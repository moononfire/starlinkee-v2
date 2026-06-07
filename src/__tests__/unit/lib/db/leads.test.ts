import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = { from: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseMock,
}));

import { checkLeadExists, createLead, getLeadByToken, markLeadAsUsed } from "@/lib/db/leads";

beforeEach(() => vi.clearAllMocks());

describe("checkLeadExists()", () => {
  it("returns false when no lead found", async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null }) })) })),
      })),
    });
    expect(await checkLeadExists(1, "+48600000000")).toBe(false);
  });

  it("returns true when lead exists", async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 1 } }) })) })),
      })),
    });
    expect(await checkLeadExists(1, "+48600000000")).toBe(true);
  });
});

describe("createLead()", () => {
  it("throws on Supabase error", async () => {
    supabaseMock.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "unique violation" } }),
        })),
      })),
    });
    await expect(createLead(1, "+48600000000", null, true, "token-abc")).rejects.toThrow("Failed to create lead");
  });

  it("returns created lead", async () => {
    const lead = { id: 1, location_id: 1, phone: "+48600000000", email: null, agreed_to_terms: true, claim_token: "token-abc", is_used: false, used_at: null, created_at: "" };
    supabaseMock.from.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: lead, error: null }),
        })),
      })),
    });
    const result = await createLead(1, "+48600000000", null, true, "token-abc");
    expect(result.claim_token).toBe("token-abc");
    expect(result.is_used).toBe(false);
  });
});

describe("getLeadByToken()", () => {
  it("returns null for unknown token", async () => {
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null }) })),
      })),
    });
    expect(await getLeadByToken("bad-token")).toBeNull();
  });

  it("returns lead for valid token", async () => {
    const lead = { id: 2, claim_token: "valid-token", is_used: false };
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: lead }) })),
      })),
    });
    expect(await getLeadByToken("valid-token")).toEqual(lead);
  });
});

describe("markLeadAsUsed()", () => {
  it("resolves on success", async () => {
    supabaseMock.from.mockReturnValue({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    });
    await expect(markLeadAsUsed(1)).resolves.toBeUndefined();
  });

  it("throws on Supabase error", async () => {
    supabaseMock.from.mockReturnValue({
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: { message: "not found" } }) })),
    });
    await expect(markLeadAsUsed(99)).rejects.toThrow("Failed to mark lead as used");
  });
});
