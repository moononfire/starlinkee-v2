import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockSendReply, mockSession, mockSingle } = vi.hoisted(() => ({
  mockSendReply: vi.fn(),
  mockSession: vi.fn(),
  mockSingle: vi.fn(),
}));

vi.mock("@/lib/portal-session", () => ({ getPortalSession: mockSession }));
vi.mock("@/lib/email", () => ({ sendReplyNotification: mockSendReply }));
vi.mock("@/lib/sms", () => ({ sendSms: vi.fn() }));
vi.mock("@/lib/sms-quota", () => ({ consumeSmsCredit: vi.fn() }));
vi.mock("@/lib/realtime/broadcast", () => ({ broadcastToChannel: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/db/review-messages", () => ({
  insertMessage: vi.fn().mockResolvedValue({ message_id: 1, sender: "owner", body: "hi", created_at: "now" }),
  markOwnerRead: vi.fn().mockResolvedValue(undefined),
  listThreadsBySubscriptionId: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ returns: () => ({ single: mockSingle }) }) }) }),
  }),
}));

import { POST } from "@/app/api/portal/messages/route";

beforeEach(() => {
  mockSendReply.mockReset().mockResolvedValue(undefined);
  mockSession.mockResolvedValue({
    customer: { customer_id: 1, preferred_language: "pl" },
    subscriptions: [{ subscription_id: 7 }],
  });
});

describe("POST /api/portal/messages — reporter email language", () => {
  it("writes to the guest in the plate's language, not the owner's", async () => {
    mockSingle.mockResolvedValue({
      data: {
        review_id: 5,
        scan_id: "s",
        contact_email: "guest@example.com",
        contact_phone: null,
        subscription_id: 7,
        plates: { plate_number: "DEPLAT", plate_language: "de" },
        subscriptions: null,
      },
    });
    const res = await POST(
      new NextRequest("http://localhost/api/portal/messages", {
        method: "POST",
        body: JSON.stringify({ reviewId: 5, body: "hi" }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockSendReply).toHaveBeenCalledWith("guest@example.com", "de", expect.any(Object));
  });

  const post = () =>
    POST(
      new NextRequest("http://localhost/api/portal/messages", {
        method: "POST",
        body: JSON.stringify({ reviewId: 5, body: "hi" }),
      })
    );
  const row = (guest_language: string | null) => ({
    data: {
      review_id: 5,
      scan_id: "s",
      contact_email: "guest@example.com",
      contact_phone: null,
      subscription_id: 7,
      guest_language,
      plates: { plate_number: "PLPLAT", plate_language: "pl" },
      subscriptions: null,
    },
  });

  it("writes in the language the guest used, even when the plate is in another one", async () => {
    mockSingle.mockResolvedValue(row("de"));
    await post();
    expect(mockSendReply).toHaveBeenCalledWith("guest@example.com", "de", expect.any(Object));
  });

  it("falls back to the plate language when guest_language is empty (older reviews)", async () => {
    mockSingle.mockResolvedValue(row(null));
    await post();
    expect(mockSendReply).toHaveBeenCalledWith("guest@example.com", "pl", expect.any(Object));
  });
});
