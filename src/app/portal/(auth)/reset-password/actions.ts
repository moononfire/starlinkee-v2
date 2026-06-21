"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function resetPasswordAction(formData: FormData) {
  const password = formData.get("password") as string;
  const passwordConfirm = formData.get("password_confirm") as string;

  if (password !== passwordConfirm) {
    redirect("/portal/reset-password?error=passwords_mismatch");
  }

  if (password.length < 8) {
    redirect("/portal/reset-password?error=password_too_short");
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[reset-password] Failed:", error);
    redirect("/portal/reset-password?error=update_failed");
  }

  redirect("/portal/dashboard");
}
