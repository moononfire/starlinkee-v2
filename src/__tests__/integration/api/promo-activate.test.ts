import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetLeadByToken, mockMarkLeadAsUsed } = vi.hoisted(() => ({
  mockGetLeadByToken: vi.fn(),
  mockMarkLeadAsUsed: vi.fn(),
}));

vi.mock("@/lib/db/leads", () => ({
  getLeadByToken: mockGetLeadByToken,
  markLeadAsUsed: mockMarkLeadAsUsed,
}));

import { POST } from "@/app/api/promo/activate/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/promo/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMarkLeadAsUsed.mockResolvedValue(undefined);
});

describe("POST /api/promo/activate", () => {
  it("returns 400 when token is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown token", async () => {
    mockGetLeadByToken.mockResolvedValue(null);
    const res = await POST(makeRequest({ token: "nonexistent" }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when coupon is already used", async () => {
    mockGetLeadByToken.mockResolvedValue({ id: 1, is_used: true });
    const res = await POST(makeRequest({ token: "used-token" }));
    expect(res.status).toBe(409);
  });

  it("returns 200 and marks lead as used for valid unused token", async () => {
    mockGetLeadByToken.mockResolvedValue({ id: 5, is_used: false });
    const res = await POST(makeRequest({ token: "valid-token" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockMarkLeadAsUsed).toHaveBeenCalledWith(5);
  });

  it("does not call markLeadAsUsed when token is invalid", async () => {
    mockGetLeadByToken.mockResolvedValue(null);
    await POST(makeRequest({ token: "bad" }));
    expect(mockMarkLeadAsUsed).not.toHaveBeenCalled();
  });
});
