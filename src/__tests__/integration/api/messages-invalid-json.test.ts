import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/portal-session", () => ({
  getPortalSession: vi.fn().mockResolvedValue({ customer: { customer_id: 1 }, subscriptions: [{ subscription_id: 7 }] }),
}));
vi.mock("@/lib/db/reviews", () => ({ getReviewByScanId: vi.fn() }));
vi.mock("@/lib/db/review-messages", () => ({
  insertMessage: vi.fn(),
  listMessagesByScanId: vi.fn(),
  markReporterRead: vi.fn(),
  markOwnerRead: vi.fn(),
  listThreadsBySubscriptionId: vi.fn(),
}));
vi.mock("@/lib/realtime/broadcast", () => ({ broadcastToChannel: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendReplyNotification: vi.fn() }));
vi.mock("@/lib/sms", () => ({ sendSms: vi.fn() }));
vi.mock("@/lib/sms-quota", () => ({ consumeSmsCredit: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: vi.fn() }) }));

import { POST as reviewMessagesPost } from "@/app/api/review/messages/route";
import { POST as portalMessagesPost, PATCH as portalMessagesPatch } from "@/app/api/portal/messages/route";

const bad = (method: string, url: string) => new NextRequest(url, { method, body: "{not json" });

describe("message routes answer 400, not 500, for a body that is not valid JSON", () => {
  it("POST /api/review/messages", async () => {
    expect((await reviewMessagesPost(bad("POST", "http://localhost/api/review/messages"))).status).toBe(400);
  });
  it("POST /api/portal/messages", async () => {
    expect((await portalMessagesPost(bad("POST", "http://localhost/api/portal/messages"))).status).toBe(400);
  });
  it("PATCH /api/portal/messages", async () => {
    expect((await portalMessagesPatch(bad("PATCH", "http://localhost/api/portal/messages"))).status).toBe(400);
  });
});
