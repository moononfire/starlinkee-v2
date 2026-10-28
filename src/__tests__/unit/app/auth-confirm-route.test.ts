import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockVerifyOtp } = vi.hoisted(() => ({ mockVerifyOtp: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { verifyOtp: mockVerifyOtp } }) }));

import { GET } from "@/app/portal/(auth)/auth/confirm/route";

const get = (qs: string) => GET(new NextRequest(`http://localhost/portal/auth/confirm?${qs}`));

beforeEach(() => mockVerifyOtp.mockReset().mockResolvedValue({ error: null }));

describe("GET /portal/auth/confirm", () => {
  it("verifies the token and redirects to the same-site next path", async () => {
    const res = await get("token_hash=h&type=signup&next=/portal/dashboard");
    expect(mockVerifyOtp).toHaveBeenCalledWith({ token_hash: "h", type: "signup" });
    expect(new URL(res.headers.get("location")!).pathname).toBe("/portal/dashboard");
  });

  it("never redirects off-site", async () => {
    const res = await get("token_hash=h&type=recovery&next=//evil.tld");
    const loc = new URL(res.headers.get("location")!);
    expect(loc.host).toBe("localhost");
    expect(loc.pathname).toBe("/portal/dashboard");
  });

  it("rejects missing or unsupported token types", async () => {
    expect(new URL((await get("type=signup")).headers.get("location")!).searchParams.get("error")).toBe("missing_code");
    expect(new URL((await get("token_hash=h&type=magiclink")).headers.get("location")!).searchParams.get("error")).toBe("missing_code");
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it("redirects to login on a failed verification", async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: "expired" } });
    const res = await get("token_hash=h&type=signup");
    expect(new URL(res.headers.get("location")!).searchParams.get("error")).toBe("auth_failed");
  });
});
