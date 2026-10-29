import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({
  getPlateById: vi.fn(),
  assign: vi.fn(),
  unassign: vi.fn(),
  createSubscription: vi.fn(),
  setActive: vi.fn(),
  upsertCustomer: vi.fn(),
  createLocation: vi.fn(),
  createUser: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({ requireAdmin: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/db/plates", () => ({
  getPlateById: m.getPlateById,
  assignPlateToSubscription: m.assign,
  unassignPlateFromSubscription: m.unassign,
}));
vi.mock("@/lib/db/subscriptions", () => ({
  createSubscription: m.createSubscription,
  setSubscriptionActive: m.setActive,
}));
vi.mock("@/lib/db/customers", () => ({ upsertCustomerByEmail: m.upsertCustomer }));
vi.mock("@/lib/db/locations", () => ({ createLocation: m.createLocation, upsertLocationLinks: vi.fn() }));
vi.mock("@/lib/password", () => ({ generateRandomPassword: () => "pw" }));
vi.mock("@/lib/email", () => ({ sendQuickPlateCredentialsToAdmin: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/storage", () => ({ uploadLogo: vi.fn() }));
vi.mock("@/lib/services/portal-account", () => ({ createConfirmedPortalUser: m.createUser }));

import { POST } from "@/app/api/admin/plates/quick-activate/route";

function request() {
  const form = new FormData();
  form.set("plate_id", "7");
  form.set("business_name", "Cafe");
  form.set("email", "Owner@Cafe.com");
  form.set("google_review_link", "https://g.page/r/cafe");
  form.set("duration", "33");
  return new NextRequest("http://localhost/api/admin/plates/quick-activate", { method: "POST", body: form });
}

beforeEach(() => {
  vi.clearAllMocks();
  m.getPlateById.mockResolvedValue({ plate_id: 7, plate_number: "ABCDEF", plate_language: "pl", subscription_id: null });
  m.upsertCustomer.mockResolvedValue(1);
  m.createSubscription.mockResolvedValue({ subscription_id: 50 });
  m.createLocation.mockResolvedValue({ location_id: 3 });
  m.assign.mockResolvedValue(true);
  m.unassign.mockResolvedValue(undefined);
  m.setActive.mockResolvedValue(undefined);
  m.createUser.mockResolvedValue("created");
});

describe("POST /api/admin/plates/quick-activate — plate assignment (F13)", () => {
  it("happy path: the plate is attached AFTER the location exists", async () => {
    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(m.assign).toHaveBeenCalledWith(7, 50);
    expect(m.createLocation.mock.invocationCallOrder[0]).toBeLessThan(m.assign.mock.invocationCallOrder[0]);
    expect(m.unassign).not.toHaveBeenCalled();
  });

  it("a failure before the attach leaves the plate free (retry works, no 'already assigned')", async () => {
    m.createLocation.mockRejectedValue(new Error("location failed"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(request());

    expect(res.status).toBe(500);
    expect(m.assign).not.toHaveBeenCalled();
    expect(m.unassign).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it("a failure after the attach releases the plate again", async () => {
    m.setActive.mockRejectedValue(new Error("activate failed"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(request());

    expect(res.status).toBe(500);
    expect(m.unassign).toHaveBeenCalledWith(7, 50);
    err.mockRestore();
  });

  it("a plate taken in the meantime gives 409 and the subscription is not activated", async () => {
    m.assign.mockResolvedValue(false);

    const res = await POST(request());

    expect(res.status).toBe(409);
    expect(m.setActive).not.toHaveBeenCalled();
    expect(m.unassign).not.toHaveBeenCalled(); // nothing of ours to release
  });
});
