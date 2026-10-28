"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { ipFromHeaders } from "@/lib/rate-limit";
import { rateLimitPersistent } from "@/lib/rate-limit-persistent";
import { createServerClient } from "@supabase/ssr";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // Supabase only sees our server's IP, so its own limits cannot tell users
  // apart: throttle per target email and per client IP before trying the password.
  const ip = ipFromHeaders(await headers());
  if (
    !(await rateLimitPersistent(`login-admin-email:${String(email).trim().toLowerCase()}`, 8, 15 * 60_000)) ||
    !(await rateLimitPersistent(`login-admin-ip:${ip}`, 30, 15 * 60_000))
  ) {
    redirect("/login?error=too_many_attempts");
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

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=invalid_credentials");
  }

  redirect("/admin/dashboard");
}

export async function logoutAction() {
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

  await supabase.auth.signOut();
  redirect("/login");
}
