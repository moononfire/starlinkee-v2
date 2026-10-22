import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockRequireAdmin, mockUpdateLocation, mockUpsertLinks, mockUpdateCustomer } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockUpdateLocation: vi.fn(),
  mockUpsertLinks: vi.fn(),
  mockUpdateCustomer: vi.fn(),
}));
vi.mock("@/lib/api-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/lib/db/locations", () => ({ updateLocation: mockUpdateLocation, upsertLocationLinks: mockUpsertLinks }));
vi.mock("@/lib/db/customers", () => ({ updateCustomer: mockUpdateCustomer }));

import { PUT as putLocation } from "@/app/api/admin/locations/route";
import { PUT as putCustomer } from "@/app/api/admin/customers/route";

const req = (body: unknown) => new NextRequest("http://localhost/x", { method: "PUT", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(null);
  mockUpdateLocation.mockResolvedValue({});
  mockUpdateCustomer.mockResolvedValue({});
});

describe("PUT /api/admin/locations", () => {
  it("accepts the editable fields", async () => {
    const res = await putLocation(req({ location_id: 1, support_email: "a@b.pl", google_review_link: "https://g.page/x" }));
    expect(res.status).toBe(200);
  });

  it("rejects non-editable columns such as subscription_id", async () => {
    const res = await putLocation(req({ location_id: 1, subscription_id: 99 }));
    expect(res.status).toBe(400);
    expect(mockUpdateLocation).not.toHaveBeenCalled();
  });

  it("rejects an unsafe Google review link", async () => {
    const res = await putLocation(req({ location_id: 1, google_review_link: "javascript:alert(1)" }));
    expect(res.status).toBe(400);
    expect(mockUpdateLocation).not.toHaveBeenCalled();
  });
});

describe("PUT /api/admin/customers", () => {
  it("accepts the editable fields", async () => {
    expect((await putCustomer(req({ customer_id: 1, customer_name: "A", is_activated: true }))).status).toBe(200);
  });

  it("rejects non-editable columns such as stripe_customer_id", async () => {
    const res = await putCustomer(req({ customer_id: 1, stripe_customer_id: "cus_x" }));
    expect(res.status).toBe(400);
    expect(mockUpdateCustomer).not.toHaveBeenCalled();
  });
});
