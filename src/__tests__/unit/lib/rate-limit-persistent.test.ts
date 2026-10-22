import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mockRpc }) }));

import { rateLimitPersistent } from "@/lib/rate-limit-persistent";
import { resetRateLimits } from "@/lib/rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimits();
});
afterEach(() => vi.unstubAllEnvs());

describe("rateLimitPersistent()", () => {
  it("uses the in-process limiter outside production (no database calls)", async () => {
    expect(await rateLimitPersistent("k", 2, 60_000)).toBe(true);
    expect(await rateLimitPersistent("k", 2, 60_000)).toBe(true);
    expect(await rateLimitPersistent("k", 2, 60_000)).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("asks Postgres in production and returns its verdict", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockRpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: false, error: null });

    expect(await rateLimitPersistent("otp:+48600", 5, 600_000)).toBe(true);
    expect(await rateLimitPersistent("otp:+48600", 5, 600_000)).toBe(false);
    expect(mockRpc).toHaveBeenCalledWith("rate_limit_hit", { p_key: "otp:+48600", p_limit: 5, p_window_seconds: 600 });
  });

  it("falls back to the in-process limiter when the database call fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockRpc.mockResolvedValue({ data: null, error: { message: "function does not exist" } });

    expect(await rateLimitPersistent("k", 1, 60_000)).toBe(true);
    expect(await rateLimitPersistent("k", 1, 60_000)).toBe(false);
  });
});
