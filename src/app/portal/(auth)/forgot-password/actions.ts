"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function forgotPasswordAction(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    redirect("/portal/forgot-password?error=missing_email");
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/portal/auth/callback?next=/portal/reset-password`,
  });

  redirect("/portal/forgot-password?sent=1");
}
