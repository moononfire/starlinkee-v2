import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser } = vi.hoisted(() => ({ mockGetUser: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ auth: { getUser: mockGetUser } }),
}));

import { POST } from "@/app/api/mobile/loyalty/google-email/route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/mobile/loyalty/google-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/mobile/loyalty/google-email", () => {
  it("returns 400 when accessToken is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 401 when the token is invalid", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid" } });
    const res = await POST(makeRequest({ accessToken: "bad-token" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when the user has no email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "1" } }, error: null });
    const res = await POST(makeRequest({ accessToken: "token" }));
    expect(res.status).toBe(401);
  });

  it("returns the email for a valid token", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "1", email: "user@gmail.com" } }, error: null });
    const res = await POST(makeRequest({ accessToken: "token" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe("user@gmail.com");
  });
});
