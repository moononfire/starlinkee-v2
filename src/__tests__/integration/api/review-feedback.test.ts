import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockUpdateFeedback, mockGetReviewByScanId } = vi.hoisted(() => ({
  mockUpdateFeedback: vi.fn(),
  mockGetReviewByScanId: vi.fn(),
}));

vi.mock("@/lib/db/reviews", () => ({
  updateFeedback: mockUpdateFeedback,
  getReviewByScanId: mockGetReviewByScanId,
}));
vi.mock("@/lib/db/plates", () => ({ getPlateByNumber: vi.fn() }));
vi.mock("@/lib/db/locations", () => ({
  getLocationBySubscriptionId: vi.fn(),
  getLocationBySlug: vi.fn(),
}));
vi.mock("@/lib/db/subscriptions", () => ({ getSubscriptionById: vi.fn() }));
vi.mock("@/lib/db/customers", () => ({ getCustomerById: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendFeedbackNotification: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: vi.fn().mockResolvedValue({ data: null }) }) }),
    }),
  }),
}));

import { POST } from "@/app/api/review/feedback/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/review/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockUpdateFeedback.mockReset().mockResolvedValue(undefined);
  mockGetReviewByScanId.mockReset().mockResolvedValue(null);
});

describe("POST /api/review/feedback", () => {
  it("returns 400 when scanId is missing", async () => {
    const res = await POST(makeRequest({ feedback_message: "great" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when feedback_message is missing", async () => {
    const res = await POST(makeRequest({ scanId: "scan-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when feedback_message is blank whitespace", async () => {
    const res = await POST(makeRequest({ scanId: "scan-1", feedback_message: "   " }));
    expect(res.status).toBe(400);
  });

  it("returns 200 and saves feedback on valid input", async () => {
    const res = await POST(makeRequest({ scanId: "scan-1", feedback_message: "Food was cold.", contact_email: "test@example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockUpdateFeedback).toHaveBeenCalledWith(
      "scan-1",
      expect.objectContaining({ feedback_message: "Food was cold.", contact_email: "test@example.com" })
    );
  });

  it("passes optional fields to updateFeedback", async () => {
    await POST(
      makeRequest({
        scanId: "scan-1",
        feedback_message: "Slow service",
        user_name: "Anna",
        contact_email: "a@b.com",
        contact_phone: "+48600000000",
      })
    );
    expect(mockUpdateFeedback).toHaveBeenCalledWith(
      "scan-1",
      expect.objectContaining({ user_name: "Anna", contact_email: "a@b.com", contact_phone: "+48600000000" })
    );
  });

  it("returns 500 when updateFeedback throws", async () => {
    mockUpdateFeedback.mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest({ scanId: "scan-1", feedback_message: "Bad food.", contact_email: "test@example.com" }));
    expect(res.status).toBe(500);
  });
});
