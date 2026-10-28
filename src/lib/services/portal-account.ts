import { createAdminClient } from "../supabase/admin";

export type CreatePortalUserResult = "created" | "exists" | "error";

/**
 * Creates a confirmed Supabase Auth user. Existing accounts are detected from
 * the createUser error instead of listUsers(), which only returns the first
 * page (50 users) and so misjudged existing accounts once there were more.
 */
export async function createConfirmedPortalUser(
  email: string,
  password: string
): Promise<CreatePortalUserResult> {
  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (!error) return "created";
  if (isEmailExistsError(error)) return "exists";
  console.error("[portal-account] createUser failed:", error);
  return "error";
}

export function isEmailExistsError(error: { code?: string; message?: string; status?: number }): boolean {
  return (
    error.code === "email_exists" ||
    error.code === "user_already_exists" ||
    /already (been )?registered|already exists/i.test(error.message ?? "")
  );
}
