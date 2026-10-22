import { createAdminClient } from "./supabase/admin";
import { rateLimit } from "./rate-limit";

/**
 * Rate limiter backed by Postgres (rate_limit_hit), shared by all Vercel
 * instances and surviving cold starts, unlike the in-process limiter. Use it
 * for anything abuse-sensitive (OTP, login, SMS, signup).
 *
 * Only active in production builds; elsewhere (tests, local dev) it uses the
 * in-process limiter. If the database call fails it degrades to the
 * in-process limiter instead of taking the endpoint down.
 */
export async function rateLimitPersistent(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return rateLimit(key, limit, windowMs);

  try {
    const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
    });
    if (error || typeof data !== "boolean") throw new Error(error?.message ?? "unexpected rate_limit_hit result");
    return data;
  } catch (err) {
    console.error("[rate-limit] persistent limiter failed, using in-memory fallback:", err);
    return rateLimit(key, limit, windowMs);
  }
}

/** Housekeeping for the rate_limits table; call from a cron. */
export async function cleanupRateLimits(): Promise<void> {
  await createAdminClient().rpc("rate_limit_cleanup");
}
