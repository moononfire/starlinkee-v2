/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

const afterCallbacks: Array<() => Promise<void> | void> = [];
let userAgent = "";

vi.mock("next/server", () => ({
  after: vi.fn((cb: () => Promise<void> | void) => {
    afterCallbacks.push(cb);
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error("REDIRECT:" + url);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => (name === "user-agent" ? userAgent : null) }),
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("@/lib/db/plates", () => ({
  getPlateByNumber: vi.fn(),
  incrementPlateVisits: vi.fn(),
}));
vi.mock("@/lib/db/subscriptions", () => ({ getSubscriptionById: vi.fn() }));
vi.mock("@/lib/db/locations", () => ({ getLocationBySubscriptionId: vi.fn() }));
vi.mock("@/lib/db/reviews", () => ({
  createScanRecord: vi.fn(),
  findScanIdByDevice: vi.fn(),
}));
vi.mock("@/lib/db/scan-tokens", () => ({ createScanToken: vi.fn() }));
vi.mock("@/lib/language", () => ({ getLanguage: vi.fn().mockResolvedValue("en") }));
vi.mock("@/components/LanguageSwitcher", () => ({ default: () => null }));
vi.mock("@/components/plate/PlateSetupForm", () => ({ default: () => null }));

import { after } from "next/server";
import PlatePage from "@/app/plate/[number]/[secret]/page";
import { getPlateByNumber, incrementPlateVisits } from "@/lib/db/plates";
import { getSubscriptionById } from "@/lib/db/subscriptions";
import { getLocationBySubscriptionId } from "@/lib/db/locations";
import { createScanRecord, findScanIdByDevice } from "@/lib/db/reviews";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";

async function render() {
  return PlatePage({ params: Promise.resolve({ number: "ABC123", secret: "s3cret" }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  afterCallbacks.length = 0;
  userAgent = IPHONE;
  vi.mocked(getPlateByNumber).mockResolvedValue({
    plate_id: 7,
    plate_number: "ABC123",
    secret_key: "s3cret",
    subscription_id: 3,
    plate_language: "en",
  } as any);
  vi.mocked(getSubscriptionById).mockResolvedValue({ status: "active" } as any);
  vi.mocked(getLocationBySubscriptionId).mockResolvedValue(null);
  vi.mocked(findScanIdByDevice).mockResolvedValue(null);
  vi.mocked(createScanRecord).mockResolvedValue("scan-1" as any);
  vi.mocked(incrementPlateVisits).mockResolvedValue(undefined);
});

describe("plate scan page — scan counting", () => {
  it("counts a real scan in after() and still redirects to the scan page", async () => {
    await expect(render()).rejects.toThrow("REDIRECT:/plate/ABC123/scan/scan-1");
    expect(after).toHaveBeenCalledTimes(1);
    expect(incrementPlateVisits).not.toHaveBeenCalled();

    await afterCallbacks[0]();
    expect(incrementPlateVisits).toHaveBeenCalledWith(7);
  });

  it("logs and swallows a failed increment without changing the redirect", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(incrementPlateVisits).mockRejectedValue(new Error("db down"));

    await expect(render()).rejects.toThrow("REDIRECT:/plate/ABC123/scan/scan-1");
    await expect(Promise.resolve(afterCallbacks[0]())).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("does not schedule a count for a bot", async () => {
    userAgent = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
    await expect(render()).rejects.toThrow("REDIRECT:");
    expect(after).not.toHaveBeenCalled();
  });

  it.each(["pending", "inactive"])("does not schedule a count for a %s subscription", async (status) => {
    vi.mocked(getSubscriptionById).mockResolvedValue({ status } as any);
    await render().catch(() => {});
    expect(after).not.toHaveBeenCalled();
  });
});
