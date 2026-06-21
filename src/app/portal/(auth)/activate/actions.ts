"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCustomerByActivationToken,
  markCustomerActivated,
} from "@/lib/db/portal";

export async function activateAccountAction(formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const passwordConfirm = formData.get("password_confirm") as string;

  if (!token) redirect("/portal/activate?error=invalid");

  if (password !== passwordConfirm) {
    redirect(`/portal/activate?token=${token}&error=passwords_mismatch`);
  }

  if (password.length < 8) {
    redirect(`/portal/activate?token=${token}&error=password_too_short`);
  }

  const customer = await getCustomerByActivationToken(token);
  if (!customer) redirect("/portal/activate?error=invalid");

  const supabaseAdmin = createAdminClient();

  const { data: existingUsers } =
    await supabaseAdmin.auth.admin.listUsers();
  const alreadyExists = existingUsers?.users?.some(
    (u) => u.email === customer.email
  );

  if (alreadyExists) {
    redirect(`/portal/activate?token=${token}&error=account_exists`);
  }

  const { error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: customer.email,
      password,
      email_confirm: true,
    });

  if (createError) {
    console.error("[activate] Failed to create auth user:", createError);
    redirect(`/portal/activate?token=${token}&error=create_failed`);
  }

  await markCustomerActivated(customer.customer_id);

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

  await supabase.auth.signInWithPassword({
    email: customer.email,
    password,
  });

  redirect("/portal/dashboard");
}
