import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSave, mockDestroy, mockSession } = vi.hoisted(() => {
  const mockSave = vi.fn();
  const mockDestroy = vi.fn();
  return {
    mockSave,
    mockDestroy,
    mockSession: {
      customerUserId: undefined as string | undefined,
      email: undefined as string | undefined,
      locationId: undefined as number | undefined,
      save: mockSave,
      destroy: mockDestroy,
    },
  };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));

vi.mock("iron-session", () => ({
  getIronSession: vi.fn().mockResolvedValue(mockSession),
}));

import { getLoyaltySession, setLoyaltySession, clearLoyaltySession } from "@/lib/session";

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.customerUserId = undefined;
  mockSession.email = undefined;
  mockSession.locationId = undefined;
});

describe("getLoyaltySession()", () => {
  it("returns the iron session object", async () => {
    const session = await getLoyaltySession();
    expect(session).toBe(mockSession);
  });
});

describe("setLoyaltySession()", () => {
  it("sets customerUserId, email and locationId on the session and calls save", async () => {
    await setLoyaltySession("11111111-1111-1111-1111-111111111111", "jan@example.com", 42);

    expect(mockSession.customerUserId).toBe("11111111-1111-1111-1111-111111111111");
    expect(mockSession.email).toBe("jan@example.com");
    expect(mockSession.locationId).toBe(42);
    expect(mockSave).toHaveBeenCalledOnce();
  });
});

describe("clearLoyaltySession()", () => {
  it("calls destroy on the session", async () => {
    await clearLoyaltySession();

    expect(mockDestroy).toHaveBeenCalledOnce();
  });
});
