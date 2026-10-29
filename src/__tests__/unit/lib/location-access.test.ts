import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSubscriptionById, mockGetLocationById } = vi.hoisted(() => ({
  mockGetSubscriptionById: vi.fn(),
  mockGetLocationById: vi.fn(),
}));
vi.mock("@/lib/db/subscriptions", () => ({ getSubscriptionById: mockGetSubscriptionById }));
vi.mock("@/lib/db/locations", () => ({ getLocationById: mockGetLocationById }));

import { isLocationActive, isLocationActiveById } from "@/lib/location-access";

beforeEach(() => vi.clearAllMocks());

describe("isLocationActive()", () => {
  it("is true only for an active subscription", async () => {
    mockGetSubscriptionById.mockResolvedValue({ status: "active" });
    expect(await isLocationActive({ subscription_id: 1 })).toBe(true);

    for (const status of ["inactive", "pending"]) {
      mockGetSubscriptionById.mockResolvedValue({ status });
      expect(await isLocationActive({ subscription_id: 1 })).toBe(false);
    }
  });

  it("is false when the subscription does not exist", async () => {
    mockGetSubscriptionById.mockResolvedValue(null);
    expect(await isLocationActive({ subscription_id: 404 })).toBe(false);
  });
});

describe("isLocationActiveById()", () => {
  it("looks the location up first; unknown location = not active", async () => {
    mockGetLocationById.mockResolvedValue(null);
    expect(await isLocationActiveById(9)).toBe(false);
    expect(mockGetSubscriptionById).not.toHaveBeenCalled();

    mockGetLocationById.mockResolvedValue({ location_id: 9, subscription_id: 4 });
    mockGetSubscriptionById.mockResolvedValue({ status: "active" });
    expect(await isLocationActiveById(9)).toBe(true);
    expect(mockGetSubscriptionById).toHaveBeenCalledWith(4);
  });
});
