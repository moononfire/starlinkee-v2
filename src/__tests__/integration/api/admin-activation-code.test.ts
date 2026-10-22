import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockRequireAdmin, mockIssue } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockIssue: vi.fn(),
}));
vi.mock("@/lib/api-auth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/lib/services/activation", () => ({ issueActivationCode: mockIssue }));

import { POST } from "@/app/api/admin/subscriptions/activation-code/route";

const req = (body: unknown) =>
  new NextRequest("http://localhost/api/admin/subscriptions/activation-code", {
    method: "POST",
    body: JSON.stringify(body),
  });

beforeEach(() => {
  mockRequireAdmin.mockReset().mockResolvedValue(null);
  mockIssue.mockReset().mockResolvedValue(true);
});

describe("POST /api/admin/subscriptions/activation-code", () => {
  it("rejects non-admins without issuing a code", async () => {
    mockRequireAdmin.mockResolvedValue(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    const res = await POST(req({ subscription_id: 5 }));
    expect(res.status).toBe(403);
    expect(mockIssue).not.toHaveBeenCalled();
  });

  it("requires a subscription id", async () => {
    expect((await POST(req({}))).status).toBe(400);
  });

  it("issues the code for an admin", async () => {
    const res = await POST(req({ subscription_id: 5 }));
    expect(res.status).toBe(200);
    expect(mockIssue).toHaveBeenCalledWith(5);
  });

  it("returns 422 when the code could not be issued", async () => {
    mockIssue.mockResolvedValue(false);
    expect((await POST(req({ subscription_id: 5 }))).status).toBe(422);
  });
});
