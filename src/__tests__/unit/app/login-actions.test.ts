import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSignIn } = vi.hoisted(() => ({ mockSignIn: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: vi.fn() }),
  headers: async () => new Headers({ "x-real-ip": "203.0.113.9" }),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
}));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { signInWithPassword: mockSignIn } }) }));

import { loginAction } from "@/app/login/actions";
import { portalLoginAction } from "@/app/portal/(auth)/login/actions";
import { resetRateLimits } from "@/lib/rate-limit";

function form(email: string, password = "pw") {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  mockSignIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
});

describe.each([
  ["admin", loginAction, "/login"],
  ["portal", portalLoginAction, "/portal/login"],
] as const)("%s login throttling", (_name, action, path) => {
  it("stops trying passwords for one email after 8 failures, whatever the casing", async () => {
    for (let i = 0; i < 8; i++) {
      await expect(action(form(i % 2 ? "Boss@X.pl" : "boss@x.pl"))).rejects.toThrow(`REDIRECT:${path}?error=invalid_credentials`);
    }
    mockSignIn.mockClear();
    await expect(action(form("boss@x.pl", "right-password"))).rejects.toThrow(`REDIRECT:${path}?error=too_many_attempts`);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("limits a single client IP across many emails", async () => {
    for (let i = 0; i < 30; i++) {
      await expect(action(form(`user${i}@x.pl`))).rejects.toThrow("invalid_credentials");
    }
    await expect(action(form("another@x.pl"))).rejects.toThrow("too_many_attempts");
  });
});
