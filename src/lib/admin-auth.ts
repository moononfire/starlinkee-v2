import type { User } from "@supabase/supabase-js";

/**
 * Portal customers and admins share the same Supabase Auth user pool, so a
 * logged-in session alone must never grant access to /admin or /api/admin.
 * Admins are identified by app_metadata.role === "admin" (set in Supabase
 * dashboard) or by the ADMIN_EMAILS allowlist (comma-separated) for a user
 * whose email is confirmed. EMAIL_ADMIN is only the notification mailbox and
 * never grants access. Fail-closed: with neither configured, nobody is an admin.
 */
export function isAdminUser(
  user: Pick<User, "email" | "app_metadata" | "email_confirmed_at"> | null
): boolean {
  if (!user?.email) return false;
  if (user.app_metadata?.role === "admin") return true;
  if (!user.email_confirmed_at) return false;

  const raw = process.env.ADMIN_EMAILS ?? "";
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(user.email.toLowerCase());
}
