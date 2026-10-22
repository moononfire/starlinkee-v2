import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockUpdateUser, mockSignIn } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockSignIn: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("redirect"); }) }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser, updateUser: mockUpdateUser } }),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { signInWithPassword: mockSignIn } }),
}));
vi.mock("@/lib/db/portal", () => ({ getCustomerByEmail: vi.fn(), getCustomerSubscriptions: vi.fn() }));
vi.mock("@/lib/db/locations", () => ({ updateLocation: vi.fn(), setLinktreeSlug: vi.fn() }));

import { updatePortalPassword } from "@/app/portal/(portal)/settings/actions";
import { resetRateLimits } from "@/lib/rate-limit";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}
const valid = { subscription_id: "1", current_password: "oldpass12", password: "newpass123", password_confirm: "newpass123" };

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
  mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "me@x.pl" } } });
  mockSignIn.mockResolvedValue({ error: null });
  mockUpdateUser.mockResolvedValue({ error: null });
});

describe("updatePortalPassword()", () => {
  it("changes the password when the current one is correct", async () => {
    const res = await updatePortalPassword(form(valid));
    expect(res.ok).toBe(true);
    expect(mockSignIn).toHaveBeenCalledWith({ email: "me@x.pl", password: "oldpass12" });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "newpass123" });
  });

  it("refuses when the current password is wrong or missing, without changing anything", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    expect((await updatePortalPassword(form(valid))).error).toBe("wrong_current");

    const { current_password: _omit, ...noCurrent } = valid;
    expect((await updatePortalPassword(form(noCurrent))).error).toBe("wrong_current");
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("limits repeated attempts", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "bad" } });
    for (let i = 0; i < 5; i++) await updatePortalPassword(form(valid));
    mockSignIn.mockResolvedValue({ error: null });
    expect((await updatePortalPassword(form(valid))).error).toBe("wrong_current");
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});
