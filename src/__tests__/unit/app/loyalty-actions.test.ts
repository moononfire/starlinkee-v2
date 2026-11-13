import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockGetCustomerByEmail, mockGetSubs, mockUpdateLocation, flag } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetCustomerByEmail: vi.fn(),
  mockGetSubs: vi.fn(),
  mockUpdateLocation: vi.fn(),
  flag: { enabled: false },
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: mockGetUser } }) }));
vi.mock("@/lib/db/portal", () => ({
  getCustomerByEmail: mockGetCustomerByEmail,
  getCustomerSubscriptions: mockGetSubs,
}));
vi.mock("@/lib/db/locations", () => ({ updateLocation: mockUpdateLocation }));
// The flag is a getter so each test can flip it, standing in for editing features.ts.
vi.mock("@/lib/features", () => ({
  get LOYALTY_ENABLED() {
    return flag.enabled;
  },
}));

import { updateLoyaltyEnabled, updateLoyaltySettings } from "@/app/portal/(portal)/[subscriptionId]/loyalty/actions";

function form(extra: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("subscription_id", "7");
  fd.set("location_id", "5");
  for (const [k, v] of Object.entries(extra)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  flag.enabled = false;
  mockGetUser.mockResolvedValue({ data: { user: { email: "me@x.pl", email_confirmed_at: "2026-01-01" } } });
  mockGetCustomerByEmail.mockResolvedValue({ customer_id: 1 });
  mockGetSubs.mockResolvedValue([{ subscription_id: 7, location: { location_id: 5 } }]);
  mockUpdateLocation.mockResolvedValue({});
});

describe("loyalty actions with LOYALTY_ENABLED=false", () => {
  it("refuses to enable the card", async () => {
    const res = await updateLoyaltyEnabled(form({ has_loyalty_enabled: "on" }));
    expect(res.ok).toBe(false);
    expect(mockUpdateLocation).not.toHaveBeenCalled();
  });

  it("still allows switching the card off", async () => {
    const res = await updateLoyaltyEnabled(form());
    expect(res.ok).toBe(true);
    expect(mockUpdateLocation).toHaveBeenCalledWith(5, { has_loyalty_enabled: false });
  });

  it("refuses to save loyalty settings", async () => {
    const res = await updateLoyaltySettings(form({ loyalty_stamps_required: "8" }));
    expect(res.ok).toBe(false);
    expect(mockUpdateLocation).not.toHaveBeenCalled();
  });
});

describe("loyalty actions with LOYALTY_ENABLED=true (one flag restores the feature)", () => {
  beforeEach(() => {
    flag.enabled = true;
  });

  it("enables the card", async () => {
    const res = await updateLoyaltyEnabled(form({ has_loyalty_enabled: "on" }));
    expect(res.ok).toBe(true);
    expect(mockUpdateLocation).toHaveBeenCalledWith(5, { has_loyalty_enabled: true });
  });

  it("saves loyalty settings", async () => {
    const res = await updateLoyaltySettings(form({ loyalty_stamps_required: "8" }));
    expect(res.ok).toBe(true);
    expect(mockUpdateLocation).toHaveBeenCalledWith(5, expect.objectContaining({ loyalty_stamps_required: 8 }));
  });
});
