import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockGetPlateByNumber,
  mockGetSubscriptionById,
  mockCreateLocation,
  mockSetSubscriptionActive,
  mockUploadLogo,
  mockSendPlateSetupConfirmation,
} = vi.hoisted(() => ({
  mockGetPlateByNumber: vi.fn(),
  mockGetSubscriptionById: vi.fn(),
  mockCreateLocation: vi.fn(),
  mockSetSubscriptionActive: vi.fn(),
  mockUploadLogo: vi.fn(),
  mockSendPlateSetupConfirmation: vi.fn(),
}));

vi.mock("@/lib/db/plates", () => ({ getPlateByNumber: mockGetPlateByNumber }));
vi.mock("@/lib/db/subscriptions", () => ({
  getSubscriptionById: mockGetSubscriptionById,
  setSubscriptionActive: mockSetSubscriptionActive,
}));
vi.mock("@/lib/db/locations", () => ({ createLocation: mockCreateLocation }));
vi.mock("@/lib/storage", () => ({ uploadLogo: mockUploadLogo }));
vi.mock("@/lib/email", () => ({ sendPlateSetupConfirmation: mockSendPlateSetupConfirmation }));

import { POST } from "@/app/api/plate/setup/route";

const pendingSubscription = { subscription_id: 10, status: "pending", duration_in_days: 365 };
const validPlate = {
  plate_id: 1,
  plate_number: "ABCDEF",
  secret_key: "correct-secret",
  subscription_id: 10,
  plate_language: "pl",
};

const validFields = {
  plateNumber: "ABCDEF",
  plateSecret: "correct-secret",
  location_name: "My Restaurant",
  google_review_link: "https://g.page/myrestaurant",
  support_email: "owner@restaurant.com",
};

function makeFormRequest(fields: Record<string, string>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return new NextRequest("http://localhost/api/plate/setup", { method: "POST", body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPlateByNumber.mockResolvedValue(validPlate);
  mockGetSubscriptionById.mockResolvedValue(pendingSubscription);
  mockCreateLocation.mockResolvedValue({ location_id: 99 });
  mockSetSubscriptionActive.mockResolvedValue(undefined);
  mockSendPlateSetupConfirmation.mockResolvedValue(undefined);
});

describe("POST /api/plate/setup", () => {
  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makeFormRequest({ plateNumber: "ABCDEF" }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when secret is wrong", async () => {
    const res = await POST(makeFormRequest({ ...validFields, plateSecret: "wrong-secret" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when plate has no subscription", async () => {
    mockGetPlateByNumber.mockResolvedValue({ ...validPlate, subscription_id: null });
    const res = await POST(makeFormRequest(validFields));
    expect(res.status).toBe(400);
  });

  it("returns 403 when plate not found", async () => {
    mockGetPlateByNumber.mockResolvedValue(null);
    const res = await POST(makeFormRequest(validFields));
    expect(res.status).toBe(403);
  });

  it("returns 400 when subscription is already active", async () => {
    mockGetSubscriptionById.mockResolvedValue({ ...pendingSubscription, status: "active" });
    const res = await POST(makeFormRequest(validFields));
    expect(res.status).toBe(400);
  });

  it("returns 200 and creates location + activates subscription on valid input", async () => {
    const res = await POST(makeFormRequest(validFields));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockCreateLocation).toHaveBeenCalledOnce();
    expect(mockSetSubscriptionActive).toHaveBeenCalledOnce();
  });

  it("activates subscription with correct dates based on duration_in_days", async () => {
    const before = Date.now();
    await POST(makeFormRequest(validFields));
    const after = Date.now();

    const [, activationIso, expirationIso] = mockSetSubscriptionActive.mock.calls[0];
    const activation = new Date(activationIso).getTime();
    const expiration = new Date(expirationIso).getTime();

    expect(activation).toBeGreaterThanOrEqual(before);
    expect(activation).toBeLessThanOrEqual(after);

    const expectedMs = 365 * 24 * 60 * 60 * 1000;
    expect(expiration - activation).toBeCloseTo(expectedMs, -3);
  });

  it("returns 400 when logo upload fails", async () => {
    mockUploadLogo.mockRejectedValue(new Error("Only PNG and JPEG images are allowed"));

    const form = new FormData();
    Object.entries(validFields).forEach(([k, v]) => form.append(k, v));
    form.append("logo", new File([new Uint8Array(100)], "photo.png", { type: "image/png" }));

    const req = new NextRequest("http://localhost/api/plate/setup", { method: "POST", body: form });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("PNG");
  });
});
