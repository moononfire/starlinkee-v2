import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({
  getReviewByScanId: vi.fn(),
  insertMessage: vi.fn(),
  getLocation: vi.fn(),
  getSubscription: vi.fn(),
  getCustomer: vi.fn(),
  sendGuestReply: vi.fn(),
  plateRow: { current: null as unknown },
}));

vi.mock("@/lib/db/reviews", () => ({ getReviewByScanId: m.getReviewByScanId }));
vi.mock("@/lib/db/review-messages", () => ({
  insertMessage: m.insertMessage,
  listMessagesByScanId: vi.fn(),
  markReporterRead: vi.fn(),
}));
vi.mock("@/lib/realtime/broadcast", () => ({ broadcastToChannel: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/db/locations", () => ({ getLocationBySubscriptionId: m.getLocation }));
vi.mock("@/lib/db/subscriptions", () => ({ getSubscriptionById: m.getSubscription }));
vi.mock("@/lib/db/customers", () => ({ getCustomerById: m.getCustomer }));
vi.mock("@/lib/email", () => ({ sendGuestReplyNotification: m.sendGuestReply }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: m.plateRow.current }) }) }) }),
  }),
}));

import { POST } from "@/app/api/review/messages/route";

let reviewId = 100;
function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/review/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  reviewId += 1; // the throttle is keyed per review, so each test gets its own thread
  m.getReviewByScanId.mockResolvedValue({ review_id: reviewId, plate_id: 7, feedback_time: "2026-10-29T10:00:00Z" });
  m.insertMessage.mockResolvedValue({ message_id: 1, sender: "reporter", body: "Still waiting", created_at: "now" });
  m.plateRow.current = { plate_language: "de", subscription_id: 50 };
  m.getLocation.mockResolvedValue({ location_name: "Cafe", support_email: "owner@cafe.com" });
  m.getSubscription.mockResolvedValue({ subscription_id: 50, customer_id: 9 });
  m.getCustomer.mockResolvedValue({ customer_id: 9, preferred_language: "pl" });
  m.sendGuestReply.mockResolvedValue(undefined);
});

describe("POST /api/review/messages — owner is told about a guest reply (F7)", () => {
  it("emails the venue's support address, in the owner's language, with the message", async () => {
    const res = await post({ scanId: "scan-1", body: "Still waiting" });

    expect(res.status).toBe(200);
    expect(m.sendGuestReply).toHaveBeenCalledOnce();
    expect(m.sendGuestReply).toHaveBeenCalledWith("owner@cafe.com", "pl", {
      locationName: "Cafe",
      message: "Still waiting",
      subscriptionId: 50,
    });
  });

  it("a second reply in the same thread within 15 minutes sends no second email", async () => {
    await post({ scanId: "scan-1", body: "first" });
    const res = await post({ scanId: "scan-1", body: "second" });

    expect(res.status).toBe(200);
    expect(m.sendGuestReply).toHaveBeenCalledTimes(1);
  });

  it("another thread is throttled separately", async () => {
    await post({ scanId: "scan-1", body: "a" });
    m.getReviewByScanId.mockResolvedValue({ review_id: reviewId + 500, plate_id: 7, feedback_time: "x" });
    await post({ scanId: "scan-2", body: "b" });

    expect(m.sendGuestReply).toHaveBeenCalledTimes(2);
  });

  it("no support email on the venue: no mail, reply still saved", async () => {
    m.getLocation.mockResolvedValue({ location_name: "Cafe", support_email: null });

    const res = await post({ scanId: "scan-1", body: "hi" });

    expect(res.status).toBe(200);
    expect(m.sendGuestReply).not.toHaveBeenCalled();
  });

  it("a failing mail never fails the guest's reply", async () => {
    m.sendGuestReply.mockRejectedValue(new Error("smtp down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await post({ scanId: "scan-1", body: "hi" });

    expect(res.status).toBe(200);
    err.mockRestore();
  });
});
