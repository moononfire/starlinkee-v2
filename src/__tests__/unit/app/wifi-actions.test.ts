import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockGetCustomerByEmail, mockGetSubs, mockUpdateLocation } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetCustomerByEmail: vi.fn(),
  mockGetSubs: vi.fn(),
  mockUpdateLocation: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: mockGetUser } }) }));
vi.mock("@/lib/db/portal", () => ({
  getCustomerByEmail: mockGetCustomerByEmail,
  getCustomerSubscriptions: mockGetSubs,
}));
vi.mock("@/lib/db/locations", () => ({ updateLocation: mockUpdateLocation }));

import { updateWifiSettingsAction } from "@/app/portal/(portal)/[subscriptionId]/wifi/actions";

function form(locationId: string) {
  const fd = new FormData();
  fd.set("location_id", locationId);
  fd.set("has_wifi_enabled", "on");
  fd.set("wifi_ssid", "Cafe");
  fd.set("wifi_password", "pw");
  return fd;
}

describe("updateWifiSettingsAction()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { email: "me@x.pl", email_confirmed_at: "2026-01-01" } } });
    mockGetCustomerByEmail.mockResolvedValue({ customer_id: 1 });
    mockGetSubs.mockResolvedValue([{ location: { location_id: 5 } }]);
    mockUpdateLocation.mockResolvedValue({});
  });

  it("updates an owned location", async () => {
    const res = await updateWifiSettingsAction(form("5"));
    expect(res.ok).toBe(true);
    expect(mockUpdateLocation).toHaveBeenCalledWith(5, {
      has_wifi_enabled: true,
      wifi_ssid: "Cafe",
      wifi_password: "pw",
    });
  });

  it("refuses a location owned by someone else", async () => {
    const res = await updateWifiSettingsAction(form("99"));
    expect(res.ok).toBe(false);
    expect(mockUpdateLocation).not.toHaveBeenCalled();
  });

  it("refuses an unauthenticated caller", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await updateWifiSettingsAction(form("5"));
    expect(res.ok).toBe(false);
    expect(mockUpdateLocation).not.toHaveBeenCalled();
  });
});
