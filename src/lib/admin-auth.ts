import type { User } from "@supabase/supabase-js";

/**
 * Portal customers and admins share the same Supabase Auth user pool, so a
 * logged-in session alone must never grant access to /admin or /api/admin.
 * Admins are identified by app_metadata.role === "admin" (set in Supabase
 * dashboard) or by the ADMIN_EMAILS allowlist (comma-separated; falls back
 * to EMAIL_ADMIN). Fail-closed: with neither configured, nobody is an admin.
 */
export function isAdminUser(
  user: Pick<User, "email" | "app_metadata"> | null
): boolean {
  if (!user?.email) return false;
  if (user.app_metadata?.role === "admin") return true;

  const raw = process.env.ADMIN_EMAILS ?? process.env.EMAIL_ADMIN ?? "";
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(user.email.toLowerCase());
}
