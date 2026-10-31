import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSession, mockGet } = vi.hoisted(() => ({ mockSession: vi.fn(), mockGet: vi.fn() }));

vi.mock("@/lib/portal-session", () => ({ getPortalSession: mockSession }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mockGet }) }));

import { getPortalLanguage } from "@/lib/portal-language";

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockReturnValue(undefined);
});

describe("getPortalLanguage()", () => {
  it("the customer's saved language wins over a stale cookie", async () => {
    mockSession.mockResolvedValue({ customer: { preferred_language: "de" } });
    mockGet.mockReturnValue({ value: "pl" });
    expect(await getPortalLanguage()).toBe("de");
  });

  it("a signed-in customer without a saved language gets English, not the cookie", async () => {
    mockSession.mockResolvedValue({ customer: { preferred_language: null } });
    mockGet.mockReturnValue({ value: "pl" });
    expect(await getPortalLanguage()).toBe("en");
  });

  it("without a customer the cookie decides (valid only)", async () => {
    mockSession.mockResolvedValue({ customer: null });
    mockGet.mockReturnValue({ value: "it" });
    expect(await getPortalLanguage()).toBe("it");
    mockGet.mockReturnValue({ value: "zh" });
    expect(await getPortalLanguage()).toBe("en");
  });
});
